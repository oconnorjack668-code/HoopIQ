-- 00016_style_match.sql
-- Play Style Match: NBA player style profiles (read-only) and each player's saved
-- match results. The player list is added at the end. Safe to re-run.

CREATE TABLE IF NOT EXISTS public.nba_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  era text NOT NULL CHECK (era IN ('modern', 'legend')),
  position text NOT NULL CHECK (position IN ('PG', 'SG', 'SF', 'PF', 'C')),
  height_cm smallint NOT NULL CHECK (height_cm BETWEEN 150 AND 240),
  archetype text NOT NULL,
  style_tags text[] NOT NULL DEFAULT '{}',
  shot_profile jsonb NOT NULL,
  strengths text[] NOT NULL DEFAULT '{}',
  signature_moves text[] NOT NULL DEFAULT '{}',
  how_to_copy text[] NOT NULL DEFAULT '{}',
  drill_skills text[] NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS public.style_match_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'profile' CHECK (source IN ('profile', 'video')),
  input jsonb NOT NULL,
  matches jsonb NOT NULL,
  report jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_style_match_results_user ON public.style_match_results(user_id, created_at DESC);

ALTER TABLE public.nba_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.style_match_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Players can view NBA style profiles" ON public.nba_players;
CREATE POLICY "Players can view NBA style profiles" ON public.nba_players FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Users view own style matches" ON public.style_match_results;
CREATE POLICY "Users view own style matches" ON public.style_match_results FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users save own style matches" ON public.style_match_results;
CREATE POLICY "Users save own style matches" ON public.style_match_results FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users delete own style matches" ON public.style_match_results;
CREATE POLICY "Users delete own style matches" ON public.style_match_results FOR DELETE USING (auth.uid() = user_id);

GRANT SELECT ON public.nba_players TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.style_match_results TO authenticated;
GRANT ALL ON public.nba_players, public.style_match_results TO service_role;
REVOKE ALL ON public.nba_players, public.style_match_results FROM anon;

-- =============================================================================
-- NBA PLAYER STYLE PROFILES
-- =============================================================================
