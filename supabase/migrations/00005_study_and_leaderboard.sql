-- 00005_study_and_leaderboard.sql
-- Basketball IQ study topics, items, reflections, quizzes, and opt-in leaderboard

-- =============================================================================
-- 1. STUDY TOPICS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.study_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text NOT NULL,
  category text NOT NULL CHECK (category IN (
    'shooting_mechanics', 'finishing', 'ball_handling', 'pick_and_roll',
    'defense', 'spacing_and_movement', 'transition', 'film_study'
  )),
  icon_name text DEFAULT 'BookOpen',
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_study_topics_active ON public.study_topics(is_active, display_order);

-- =============================================================================
-- 2. STUDY ITEMS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.study_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid NOT NULL REFERENCES public.study_topics(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  youtube_video_id text NOT NULL,
  youtube_channel text NOT NULL,
  duration_minutes integer,
  key_takeaways text[] DEFAULT '{}',
  reflection_prompt text NOT NULL,
  quiz_questions jsonb DEFAULT '[]', -- [{question: text, options: text[], correct_index: int, explanation: text}]
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_study_items_topic ON public.study_items(topic_id, is_active, display_order);

-- =============================================================================
-- 3. STUDY PROGRESS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.study_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.study_items(id) ON DELETE CASCADE,
  watched boolean NOT NULL DEFAULT false,
  reflection_notes text,
  quiz_score smallint CHECK (quiz_score IS NULL OR (quiz_score >= 0 AND quiz_score <= 100)),
  quiz_answers jsonb DEFAULT '[]',
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_study_progress_user ON public.study_progress(user_id, completed_at);

-- =============================================================================
-- 4. LEADERBOARD SEASONS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.leaderboard_seasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  scoring_rules jsonb NOT NULL DEFAULT '{
    "goal_adherence_weight": 0.40,
    "variety_weight": 0.25,
    "study_weight": 0.20,
    "challenge_weight": 0.15,
    "max_daily_session_points": 100,
    "max_weekly_points": 1000
  }',
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_seasons_active ON public.leaderboard_seasons(is_active);

-- =============================================================================
-- 5. CHALLENGE COMPLETIONS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.challenge_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  season_id uuid REFERENCES public.leaderboard_seasons(id) ON DELETE SET NULL,
  challenge_type text NOT NULL CHECK (challenge_type IN (
    'perfect_streak_week',
    'balanced_development',
    'study_master',
    'shooting_milestone',
    'strength_consistency',
    'custom'
  )),
  title text NOT NULL,
  points_earned integer NOT NULL DEFAULT 0 CHECK (points_earned >= 0),
  verified boolean NOT NULL DEFAULT true,
  metadata jsonb DEFAULT '{}',
  completed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_challenge_completions_user ON public.challenge_completions(user_id, completed_at);

-- =============================================================================
-- 6. REWARD EVENTS & BADGES
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.reward_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('badge_earned', 'tier_unlocked', 'milestone_reached')),
  badge_id text NOT NULL,
  badge_title text NOT NULL,
  badge_description text NOT NULL,
  icon_name text NOT NULL DEFAULT 'Award',
  tier text DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'diamond', 'legend')),
  season_id uuid REFERENCES public.leaderboard_seasons(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reward_events_user ON public.reward_events(user_id);

-- =============================================================================
-- 7. ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.study_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard_seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_events ENABLE ROW LEVEL SECURITY;

-- study_topics: All authenticated users can read active topics
CREATE POLICY "Users can view active study topics"
  ON public.study_topics FOR SELECT
  USING (is_active = true);

-- study_items: All authenticated users can read active items
CREATE POLICY "Users can view active study items"
  ON public.study_items FOR SELECT
  USING (is_active = true);

-- study_progress: Users can CRUD own progress
CREATE POLICY "Users can view own study progress"
  ON public.study_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own study progress"
  ON public.study_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own study progress"
  ON public.study_progress FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own study progress"
  ON public.study_progress FOR DELETE
  USING (auth.uid() = user_id);

-- leaderboard_seasons: All authenticated users can read seasons
CREATE POLICY "Users can view leaderboard seasons"
  ON public.leaderboard_seasons FOR SELECT
  USING (true);

-- challenge_completions: Users can view own and public player completions
CREATE POLICY "Users can view own challenge completions"
  ON public.challenge_completions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own challenge completions"
  ON public.challenge_completions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- reward_events: Users can view own badges / rewards
CREATE POLICY "Users can view own reward events"
  ON public.reward_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reward events"
  ON public.reward_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);
