-- 00023_speed_and_safety.sql
-- Audit fixes. Safe to re-run.
-- 1. my_shot_totals(): career makes/attempts per zone added up in the database. The app used to
--    download every shooting row, and Supabase stops at 1,000 rows per request, so career
--    shooting %, total makes (badges) and zone stats went wrong for players with long histories.
-- 2. Indexes for lookups the app makes on every dashboard load, and for deletes that cascade.
-- 3. Team assignment links must stay inside HoopIQ ("//other-site" was accepted before).

-- =============================================================================
-- 1. CAREER SHOOTING TOTALS
-- =============================================================================
-- SECURITY INVOKER: runs with the player's own permissions, so row level security still applies
-- and it only ever adds up the signed-in player's shots.
CREATE OR REPLACE FUNCTION public.my_shot_totals()
RETURNS TABLE (shot_zone text, makes integer, attempts integer)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT s.shot_zone, SUM(s.makes)::integer, SUM(s.attempts)::integer
  FROM public.shooting_entries s
  WHERE s.user_id = auth.uid()
  GROUP BY s.shot_zone
$$;

REVOKE EXECUTE ON FUNCTION public.my_shot_totals() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_shot_totals() TO authenticated, service_role;

-- =============================================================================
-- 2. INDEXES
-- =============================================================================
-- This week's makes (achievements, goals) and the AI Coach's last 30 days filter by date
CREATE INDEX IF NOT EXISTS idx_shooting_entries_user_created ON public.shooting_entries (user_id, created_at DESC);
-- Program sessions this week (achievements, every dashboard load)
CREATE INDEX IF NOT EXISTS idx_program_day_completions_user ON public.program_day_completions (user_id, completed_at DESC);
-- Friends list / feed look up both sides of a friendship (addressee_id already has one)
CREATE INDEX IF NOT EXISTS idx_friendships_requester ON public.friendships (requester_id);
-- Deleting a training session clears its link from video analyses
CREATE INDEX IF NOT EXISTS idx_video_analyses_session ON public.video_analyses (session_id) WHERE session_id IS NOT NULL;
-- Account deletion removes a player's ticked-off team assignments
CREATE INDEX IF NOT EXISTS idx_team_assignment_completions_user ON public.team_assignment_completions (user_id);

-- =============================================================================
-- 3. TEAM ASSIGNMENT LINKS STAY IN THE APP
-- =============================================================================
-- "/basketball/new" is fine; "//evil.example" and "/\evil.example" open another website.
UPDATE public.team_assignments
SET link = NULL
WHERE link IS NOT NULL
  AND NOT (link ~ '^/($|[^/\\])' AND link !~ '[\\[:cntrl:]]');

ALTER TABLE public.team_assignments DROP CONSTRAINT IF EXISTS team_assignments_link_check;
ALTER TABLE public.team_assignments DROP CONSTRAINT IF EXISTS team_assignments_link_in_app;
ALTER TABLE public.team_assignments ADD CONSTRAINT team_assignments_link_in_app CHECK (
  link IS NULL OR (char_length(link) <= 300 AND link ~ '^/($|[^/\\])' AND link !~ '[\\[:cntrl:]]')
);
