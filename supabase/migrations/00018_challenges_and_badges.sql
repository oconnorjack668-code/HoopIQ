-- 00018_challenges_and_badges.sql
-- Recurring weekly challenges (awarded automatically by the server), one-time
-- badges, and uniqueness so nothing is awarded twice. Safe to re-run.

-- Challenge definitions: what to measure and the target
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS rules jsonb NOT NULL DEFAULT '{}';
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS recurring boolean NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS idx_challenges_slug ON public.challenges(slug);

-- A weekly challenge can be completed once per week
ALTER TABLE public.challenge_completions ADD COLUMN IF NOT EXISTS period_start date;
CREATE UNIQUE INDEX IF NOT EXISTS idx_challenge_completions_once
  ON public.challenge_completions(user_id, challenge_id, period_start);

-- Each badge is earned once
CREATE UNIQUE INDEX IF NOT EXISTS idx_reward_events_badge_once ON public.reward_events(user_id, badge_id);

-- Badges are awarded by the server only (like challenge completions in 00007)
DROP POLICY IF EXISTS "Users can insert own reward events" ON public.reward_events;

-- Recurring weekly challenges (Monday to Sunday). Points go to the active season.
INSERT INTO public.challenges (slug, season_id, challenge_type, title, description, points, start_date, end_date, is_active, recurring, rules)
SELECT v.slug, NULL, v.challenge_type, v.title, v.description, v.points, CURRENT_DATE, DATE '2099-12-31', true, true, v.rules::jsonb
FROM (VALUES
  ('weekly-4-days', 'perfect_streak_week', 'Train 4 days', 'Log a basketball session or workout on 4 different days this week.', 50, '{"metric":"training_days","target":4}'),
  ('weekly-200-makes', 'shooting_milestone', 'Make 200 shots', 'Log 200 made shots this week.', 50, '{"metric":"makes","target":200}'),
  ('weekly-2-lessons', 'study_master', 'Complete 2 IQ lessons', 'Pass the quiz on 2 Basketball IQ lessons this week.', 30, '{"metric":"study_lessons","target":2}'),
  ('weekly-2-workouts', 'strength_consistency', '2 gym workouts', 'Log 2 gym workouts this week.', 40, '{"metric":"workouts","target":2}'),
  ('weekly-balanced', 'balanced_development', 'Balanced week', 'Log at least one basketball session, one workout and one IQ lesson this week.', 60, '{"metric":"balanced","target":3}'),
  ('weekly-3-program', 'custom', '3 program sessions', 'Complete 3 sessions of your training program this week.', 40, '{"metric":"program_sessions","target":3}')
) AS v(slug, challenge_type, title, description, points, rules)
WHERE NOT EXISTS (SELECT 1 FROM public.challenges c WHERE c.slug = v.slug);
