-- 00015_guides.sql
-- Practical guides: mental game, recovery, nutrition, injury prevention,
-- jumping higher and game-day prep. Read-only for players. Safe to re-run.

CREATE TABLE IF NOT EXISTS public.guides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  category text NOT NULL CHECK (category IN ('mental_game', 'recovery', 'nutrition', 'injury_prevention', 'vertical', 'game_prep')),
  title text NOT NULL,
  summary text NOT NULL,
  reading_minutes smallint NOT NULL DEFAULT 5,
  sections jsonb NOT NULL DEFAULT '[]',
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.guides ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Players can view guides" ON public.guides;
CREATE POLICY "Players can view guides" ON public.guides FOR SELECT TO authenticated USING (true);

GRANT SELECT ON public.guides TO authenticated;
GRANT ALL ON public.guides TO service_role;
REVOKE ALL ON public.guides FROM anon;

-- =============================================================================
-- GUIDES
-- =============================================================================
