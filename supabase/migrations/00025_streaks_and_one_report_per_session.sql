-- 00025_streaks_and_one_report_per_session.sql
--
-- 1. my_training_streaks(): longest and current training streak worked out in the database.
--    The app had to download every session and workout date to compute these, which grows
--    forever and runs on the three most-visited screens, so it was capped at the last two
--    years. With this function there is no cap and no rows are transferred.
-- 2. One AI report per session, enforced by the database. The app checks before writing, but
--    it cannot check and insert atomically, so two taps a second apart could both pass and
--    the player paid two credits for one session.
--
-- SAFE TO RE-RUN. Section 2 deletes duplicate reports - see the warning there before running.

-- =============================================================================
-- 1. TRAINING STREAKS
-- =============================================================================
-- Takes the player's calendar date rather than using CURRENT_DATE: the server runs on UTC,
-- which is an hour behind Ireland in summer, so between midnight and 1am CURRENT_DATE is
-- still yesterday and a live streak would look broken.
--
-- SECURITY INVOKER: runs with the player's own permissions, so row level security still
-- applies and it only ever sees the signed-in player's training.
CREATE OR REPLACE FUNCTION public.my_training_streaks(p_today date)
RETURNS TABLE (longest_streak integer, current_streak integer)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH days AS (
    SELECT DISTINCT s.session_date AS d
    FROM public.training_sessions s
    WHERE s.user_id = auth.uid() AND s.session_date <= p_today
    UNION
    SELECT DISTINCT w.workout_date
    FROM public.workouts w
    WHERE w.user_id = auth.uid() AND w.workout_date <= p_today
  ),
  -- Consecutive dates share a value here, because subtracting the row number from the date
  -- cancels the daily increment. A gap shifts every later date onto a new group.
  islands AS (
    SELECT d, (d - (ROW_NUMBER() OVER (ORDER BY d))::integer) AS grp
    FROM days
  ),
  runs AS (
    SELECT COUNT(*)::integer AS len, MAX(d) AS ended
    FROM islands
    GROUP BY grp
  )
  SELECT
    COALESCE(MAX(r.len), 0)::integer,
    -- A run counts as current if it reaches today or yesterday; runs are disjoint, so at
    -- most one can qualify. Yesterday counts so the streak does not appear to break during
    -- the day before the player has trained.
    COALESCE(MAX(r.len) FILTER (WHERE r.ended >= p_today - 1), 0)::integer
  FROM runs r
$$;

REVOKE EXECUTE ON FUNCTION public.my_training_streaks(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_training_streaks(date) TO authenticated, service_role;

-- Streaks and "this week" read these two columns together on every dashboard load
CREATE INDEX IF NOT EXISTS idx_training_sessions_user_date ON public.training_sessions (user_id, session_date DESC);
CREATE INDEX IF NOT EXISTS idx_workouts_user_date ON public.workouts (user_id, workout_date DESC);

-- =============================================================================
-- 2. ONE AI REPORT PER SESSION
-- =============================================================================
-- WARNING: this DELETE removes duplicate post-session AI reports, keeping the OLDEST one for
-- each session. It only ever touches rows that duplicate another row for the same player and
-- the same session. To see what it would delete before running, use the SELECT in the comment
-- below. If it returns no rows, the DELETE is a no-op and you have never hit the race.
--
--   SELECT user_id, source_session_ids[1] AS session_id, COUNT(*)
--   FROM public.ai_reports
--   WHERE report_type = 'post_session' AND array_length(source_session_ids, 1) = 1
--   GROUP BY 1, 2 HAVING COUNT(*) > 1;
--
-- The unique index below cannot be created while duplicates exist, which is why this runs first.
DELETE FROM public.ai_reports a
WHERE a.report_type = 'post_session'
  AND array_length(a.source_session_ids, 1) = 1
  AND EXISTS (
    SELECT 1
    FROM public.ai_reports b
    WHERE b.report_type = 'post_session'
      AND array_length(b.source_session_ids, 1) = 1
      AND b.user_id = a.user_id
      AND b.source_session_ids[1] = a.source_session_ids[1]
      AND (b.created_at < a.created_at OR (b.created_at = a.created_at AND b.id < a.id))
  );

-- Partial, because only post-session reports are one-per-session: a weekly report legitimately
-- covers several sessions, and those rows are left alone.
CREATE UNIQUE INDEX IF NOT EXISTS ai_reports_one_per_session
ON public.ai_reports (user_id, (source_session_ids[1]))
WHERE report_type = 'post_session' AND array_length(source_session_ids, 1) = 1;
