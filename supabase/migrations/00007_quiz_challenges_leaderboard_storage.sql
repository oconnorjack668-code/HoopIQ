-- 00007_quiz_challenges_leaderboard_storage.sql
-- Tables, columns, and storage the app uses that 00001-00006 never created:
-- quiz completions, seasonal challenges, computed leaderboard standings,
-- a video title column, and the private "videos" storage bucket.
-- Also closes two self-service write paths that let players award themselves
-- credits or leaderboard points. Safe to re-run.

-- =============================================================================
-- 1. QUIZ COMPLETIONS (one row per topic quiz attempt)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.quiz_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL REFERENCES public.study_topics(id) ON DELETE CASCADE,
  score integer NOT NULL CHECK (score >= 0),
  total_questions integer NOT NULL CHECK (total_questions > 0 AND total_questions >= score),
  percentage smallint NOT NULL CHECK (percentage BETWEEN 0 AND 100),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quiz_completions_user ON public.quiz_completions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_completions_topic ON public.quiz_completions(user_id, topic_id);

ALTER TABLE public.quiz_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own quiz completions" ON public.quiz_completions;
CREATE POLICY "Users can view own quiz completions"
  ON public.quiz_completions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own quiz completions" ON public.quiz_completions;
CREATE POLICY "Users can insert own quiz completions"
  ON public.quiz_completions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- 2. CHALLENGES (Season challenge definitions; managed server-side)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid REFERENCES public.leaderboard_seasons(id) ON DELETE CASCADE,
  challenge_type text NOT NULL CHECK (challenge_type IN (
    'perfect_streak_week',
    'balanced_development',
    'study_master',
    'shooting_milestone',
    'strength_consistency',
    'custom'
  )),
  title text NOT NULL,
  description text NOT NULL,
  points integer NOT NULL DEFAULT 50 CHECK (points >= 0),
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_challenges_season_active ON public.challenges(season_id, is_active);

ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view challenges" ON public.challenges;
CREATE POLICY "Users can view challenges"
  ON public.challenges FOR SELECT
  TO authenticated
  USING (true);

-- Link completions to the challenge they complete
ALTER TABLE public.challenge_completions
  ADD COLUMN IF NOT EXISTS challenge_id uuid REFERENCES public.challenges(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_challenge_completions_challenge ON public.challenge_completions(challenge_id);

-- Challenge points count toward the leaderboard, so completions are awarded
-- server-side only (service role). Players can no longer insert their own.
DROP POLICY IF EXISTS "Users can insert own challenge completions" ON public.challenge_completions;

-- =============================================================================
-- 3. LEADERBOARD STANDINGS (computed view, always up to date)
-- =============================================================================
-- Points per season:
--   +10 per active training day (a basketball session or workout; max 1 per day)
--   +10 per study topic quiz passed at 80%+ (once per topic)
--   + points from verified challenge completions
-- Only players with a public profile appear to others; you always see yourself.
-- The view runs with its owner's privileges so it can total across players;
-- it exposes only display names and totals, never raw session data.
DROP VIEW IF EXISTS public.leaderboard_standings;

CREATE VIEW public.leaderboard_standings AS
WITH activity_days AS (
  SELECT user_id, session_date AS day FROM public.training_sessions
  UNION
  SELECT user_id, workout_date AS day FROM public.workouts
),
streak_groups AS (
  SELECT
    user_id,
    day,
    day - (ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY day))::int AS grp
  FROM activity_days
  WHERE day <= CURRENT_DATE
),
streaks AS (
  -- The run of consecutive days that ends today or yesterday
  SELECT user_id, COUNT(*)::int AS current_streak
  FROM streak_groups
  GROUP BY user_id, grp
  HAVING MAX(day) >= CURRENT_DATE - 1
),
eligible AS (
  SELECT p.id AS user_id, p.display_name
  FROM public.profiles p
  WHERE p.is_public = true OR p.id = auth.uid()
),
season_stats AS (
  SELECT
    s.id AS season_id,
    e.user_id,
    e.display_name,
    (SELECT COUNT(*) FROM public.training_sessions t
      WHERE t.user_id = e.user_id
        AND t.session_date BETWEEN s.starts_at::date AND LEAST(s.ends_at::date, CURRENT_DATE))::int AS sessions_completed,
    (SELECT COUNT(*) FROM activity_days a
      WHERE a.user_id = e.user_id
        AND a.day BETWEEN s.starts_at::date AND LEAST(s.ends_at::date, CURRENT_DATE))::int AS training_days,
    (SELECT COUNT(DISTINCT q.topic_id) FROM public.quiz_completions q
      WHERE q.user_id = e.user_id
        AND q.percentage >= 80
        AND q.created_at >= s.starts_at
        AND q.created_at < s.ends_at)::int AS quizzes_passed,
    (SELECT COALESCE(SUM(c.points_earned), 0) FROM public.challenge_completions c
      WHERE c.user_id = e.user_id
        AND c.verified = true
        AND c.season_id = s.id)::int AS challenge_points
  FROM public.leaderboard_seasons s
  CROSS JOIN eligible e
)
SELECT
  ss.user_id AS id,
  ss.season_id,
  ss.user_id,
  ss.display_name AS player_name,
  (ss.training_days * 10 + ss.quizzes_passed * 10 + ss.challenge_points) AS points,
  RANK() OVER (
    PARTITION BY ss.season_id
    ORDER BY (ss.training_days * 10 + ss.quizzes_passed * 10 + ss.challenge_points) DESC
  )::int AS rank,
  ss.sessions_completed,
  ss.training_days,
  ss.quizzes_passed,
  ss.challenge_points,
  COALESCE(st.current_streak, 0) AS current_streak
FROM season_stats ss
LEFT JOIN streaks st ON st.user_id = ss.user_id;

REVOKE ALL ON public.leaderboard_standings FROM anon;
GRANT SELECT ON public.leaderboard_standings TO authenticated;

-- =============================================================================
-- 4. VIDEO TITLE
-- =============================================================================
ALTER TABLE public.video_assets ADD COLUMN IF NOT EXISTS title text;

-- =============================================================================
-- 5. VIDEO STORAGE BUCKET (private; each player uploads into their own folder)
-- =============================================================================
-- 50MB matches the Supabase free-plan upload limit.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('videos', 'videos', false, 52428800, ARRAY['video/mp4', 'video/quicktime', 'video/webm'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Files are stored at videos/<user_id>/<file>, so the first folder must be the uploader's id
DROP POLICY IF EXISTS "Users can upload own videos" ON storage.objects;
CREATE POLICY "Users can upload own videos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'videos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can view own videos" ON storage.objects;
CREATE POLICY "Users can view own videos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'videos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete own videos" ON storage.objects;
CREATE POLICY "Users can delete own videos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'videos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- =============================================================================
-- 6. SUBSCRIPTIONS ARE SERVER-MANAGED
-- =============================================================================
-- 00001 let players update their own subscription row, which included
-- plan_type and ai_credits_remaining. Plan and credit changes must go through
-- the server (service role) or Stripe webhooks.
DROP POLICY IF EXISTS "Users can update own subscription basic metadata" ON public.subscriptions;
