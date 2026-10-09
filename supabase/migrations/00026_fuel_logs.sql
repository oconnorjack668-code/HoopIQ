-- 00026_fuel_logs.sql
--
-- Fuelling habits around training: did you eat before and after, hydration,
-- sleep, and how you felt.
--
-- Deliberately NOT calories or macros. Players here start at 13, and a numeric
-- intake target aimed at teenagers is a well-documented route into disordered
-- eating. It would also contradict the app's own AI safety rules, which forbid
-- extreme dieting advice and keep nutrition guidance general for under-18s.
-- There is no total to minimise in this table and no score to optimise.
--
-- SAFE TO RE-RUN.

CREATE TABLE IF NOT EXISTS public.fuel_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- The player's own calendar date, same convention as session_date/workout_date
  log_date date NOT NULL,
  ate_before boolean,
  ate_after boolean,
  hydration text CHECK (hydration IN ('low', 'ok', 'good')),
  -- Bounded so a typo cannot poison the averages the app shows
  sleep_hours numeric(4,1) CHECK (sleep_hours >= 0 AND sleep_hours <= 16),
  energy smallint CHECK (energy >= 1 AND energy <= 5),
  notes text CHECK (notes IS NULL OR length(notes) <= 1000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- One row per player per day; the app upserts on this
  CONSTRAINT fuel_logs_one_per_day UNIQUE (user_id, log_date)
);

-- Every read is "this player's recent days, newest first"
CREATE INDEX IF NOT EXISTS idx_fuel_logs_user_date ON public.fuel_logs (user_id, log_date DESC);

ALTER TABLE public.fuel_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own fuel logs" ON public.fuel_logs;
CREATE POLICY "Users manage own fuel logs" ON public.fuel_logs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fuel_logs TO authenticated;
GRANT ALL ON public.fuel_logs TO service_role;
