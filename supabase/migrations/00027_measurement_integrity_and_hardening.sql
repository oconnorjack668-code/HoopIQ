-- 00027_measurement_integrity_and_hardening.sql
--
-- Findings from a full audit of migrations 00001-00026.
--
-- 1. Players could rewrite their own measured video data, not just confirm it.
-- 2. Deleting a video analysis job did a full table scan to find its children.
-- 3. Three SECURITY DEFINER functions from 00001 had a mutable search_path.
-- 4. A dead leaderboard view from 00007 still existed and disagreed with the
--    function that replaced it.
--
-- SAFE TO RE-RUN.

-- =============================================================================
-- 1. VIDEO MEASUREMENTS ARE CONFIRMED, NOT EDITED
-- =============================================================================
-- 00006 gave players a blanket UPDATE policy on video_measurements. These rows
-- are the output of the on-device analysis: the player is only ever meant to
-- confirm or correct the call on a shot. With a table-wide UPDATE grant, a
-- direct supabase.from('video_measurements').update(...) could rewrite `value`,
-- `confidence`, `measurement_type` or `landmarks` - the numbers that feed the
-- AI coach report and the progress charts. Someone could manufacture a release
-- angle they never had, and every downstream feature would believe it.
--
-- Column-level grants, following the pattern 00024 already uses for teams.
-- The RLS policy still restricts WHICH rows; this restricts WHICH COLUMNS.
REVOKE UPDATE ON public.video_measurements FROM authenticated;
GRANT UPDATE (shot_outcome, player_confirmed) ON public.video_measurements TO authenticated;

-- The UPDATE policy also had no WITH CHECK, so a row could in principle be
-- updated to belong to someone else. Re-created with one.
DROP POLICY IF EXISTS "Users can update own video measurements" ON public.video_measurements;
CREATE POLICY "Users can update own video measurements"
  ON public.video_measurements FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- 2. CASCADE DELETE INDEX
-- =============================================================================
-- video_measurements.job_id cascades from video_analysis_jobs but had no index
-- with job_id leading, so deleting a job scanned the whole table for children.
CREATE INDEX IF NOT EXISTS idx_video_measurements_job ON public.video_measurements (job_id);

-- =============================================================================
-- 3. PIN search_path ON THE OLDEST SECURITY DEFINER FUNCTIONS
-- =============================================================================
-- Every SECURITY DEFINER function from 00021 onward sets search_path; these
-- three from 00001 never did. Their bodies already schema-qualify everything,
-- so this is defence in depth and consistency rather than a live hole - but it
-- is also what Supabase's own linter flags as function_search_path_mutable.
ALTER FUNCTION public.is_owner() SET search_path = public;
ALTER FUNCTION public.is_admin_or_owner() SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;

-- =============================================================================
-- 4. DROP THE DEAD LEADERBOARD VIEW
-- =============================================================================
-- 00007 created public.leaderboard_standings. Nothing in the app has queried it
-- since leaderboard_page() replaced it, and it computes points without the
-- per-player time zone handling 00024 introduced - so anything that did start
-- reading it again would quietly disagree with the live leaderboard. Its
-- definition remains in 00007 if it is ever wanted back.
DROP VIEW IF EXISTS public.leaderboard_standings;
