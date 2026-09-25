-- 00014_training_programs.sql
-- Multi-week training programs (day-by-day plans made of drills, gym exercises,
-- study lessons and tests), plus each player's enrollment and completed days.
-- Program content is added at the end. Safe to re-run.

CREATE TABLE IF NOT EXISTS public.training_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  goal text NOT NULL CHECK (goal IN ('shooting', 'ball_handling', 'finishing', 'athleticism', 'vertical', 'complete', 'in_season')),
  level text NOT NULL CHECK (level IN ('beginner', 'intermediate', 'advanced', 'all')),
  position text NOT NULL DEFAULT 'any' CHECK (position IN ('any', 'guard', 'wing', 'big')),
  weeks smallint NOT NULL CHECK (weeks BETWEEN 1 AND 16),
  sessions_per_week smallint NOT NULL CHECK (sessions_per_week BETWEEN 1 AND 7),
  season text NOT NULL DEFAULT 'any' CHECK (season IN ('off_season', 'in_season', 'any')),
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.program_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.training_programs(id) ON DELETE CASCADE,
  week smallint NOT NULL CHECK (week >= 1),
  day smallint NOT NULL CHECK (day >= 1),
  title text NOT NULL,
  focus text NOT NULL,
  estimated_minutes integer NOT NULL CHECK (estimated_minutes BETWEEN 5 AND 180),
  items jsonb NOT NULL DEFAULT '[]',
  UNIQUE (program_id, week, day)
);
CREATE INDEX IF NOT EXISTS idx_program_days_program ON public.program_days(program_id, week, day);

-- A player follows one program at a time (older enrollments are kept as history)
CREATE TABLE IF NOT EXISTS public.program_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_id uuid NOT NULL REFERENCES public.training_programs(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'stopped')),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_program_enrollments_one_active
  ON public.program_enrollments(user_id) WHERE status = 'active';

CREATE TABLE IF NOT EXISTS public.program_day_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enrollment_id uuid NOT NULL REFERENCES public.program_enrollments(id) ON DELETE CASCADE,
  program_day_id uuid NOT NULL REFERENCES public.program_days(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (enrollment_id, program_day_id)
);

ALTER TABLE public.training_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_day_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Players can view programs" ON public.training_programs;
CREATE POLICY "Players can view programs" ON public.training_programs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Players can view program days" ON public.program_days;
CREATE POLICY "Players can view program days" ON public.program_days FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Users manage own enrollments" ON public.program_enrollments;
CREATE POLICY "Users manage own enrollments" ON public.program_enrollments
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users manage own day completions" ON public.program_day_completions;
CREATE POLICY "Users manage own day completions" ON public.program_day_completions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- This project does not auto-grant new tables to the API roles (see 00008)
GRANT SELECT ON public.training_programs, public.program_days TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.program_enrollments, public.program_day_completions TO authenticated;
GRANT ALL ON public.training_programs, public.program_days, public.program_enrollments, public.program_day_completions TO service_role;
REVOKE ALL ON public.training_programs, public.program_days, public.program_enrollments, public.program_day_completions FROM anon;

-- =============================================================================
-- PROGRAMS
-- =============================================================================
