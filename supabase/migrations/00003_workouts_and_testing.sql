-- 00003_workouts_and_testing.sql
-- Workouts, exercise library, workout sets, and performance tests

-- =============================================================================
-- 1. EXERCISE LIBRARY (System default + user custom)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.exercise_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL means system-wide exercise
  name text NOT NULL,
  category text NOT NULL CHECK (category IN (
    'legs', 'upper_body_push', 'upper_body_pull', 'core',
    'plyometrics', 'mobility', 'conditioning', 'recovery', 'warmup'
  )),
  muscle_groups text[] DEFAULT '{}',
  equipment text[] DEFAULT '{}',
  description text,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exercise_library_lookup ON public.exercise_library(is_system, user_id, category);

-- =============================================================================
-- 2. WORKOUTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_date date NOT NULL DEFAULT CURRENT_DATE,
  workout_type text NOT NULL CHECK (workout_type IN ('strength', 'power_plyos', 'mobility', 'recovery', 'conditioning', 'testing', 'mixed')),
  duration_minutes integer NOT NULL CHECK (duration_minutes > 0 AND duration_minutes <= 600),
  rpe smallint NOT NULL CHECK (rpe BETWEEN 1 AND 10),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workouts_user_date ON public.workouts(user_id, workout_date DESC);
CREATE INDEX IF NOT EXISTS idx_workouts_user_type ON public.workouts(user_id, workout_type);

-- =============================================================================
-- 3. WORKOUT SETS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.workout_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id uuid NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id uuid REFERENCES public.exercise_library(id) ON DELETE SET NULL,
  exercise_name text NOT NULL,
  exercise_category text,
  set_number smallint NOT NULL CHECK (set_number > 0),
  reps integer CHECK (reps IS NULL OR reps >= 0),
  weight_kg numeric CHECK (weight_kg IS NULL OR weight_kg >= 0),
  duration_seconds integer CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  distance_meters numeric CHECK (distance_meters IS NULL OR distance_meters >= 0),
  rpe smallint CHECK (rpe IS NULL OR (rpe BETWEEN 1 AND 10)),
  is_personal_record boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workout_sets_workout_id ON public.workout_sets(workout_id);
CREATE INDEX IF NOT EXISTS idx_workout_sets_user_exercise ON public.workout_sets(user_id, exercise_name);

-- =============================================================================
-- 4. PERFORMANCE TESTS (Vertical, sprint, agility, etc.)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.performance_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  test_date date NOT NULL DEFAULT CURRENT_DATE,
  test_type text NOT NULL CHECK (test_type IN (
    'standing_vertical',
    'approach_vertical',
    'sprint_three_quarter',
    'sprint_40yd',
    'lane_agility',
    'pro_agility_5_10_5',
    'standing_broad_jump',
    'custom'
  )),
  custom_test_name text,
  value numeric NOT NULL CHECK (value > 0),
  unit text NOT NULL CHECK (unit IN ('inches', 'cm', 'seconds', 'meters', 'reps')),
  is_personal_record boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_performance_tests_user_type ON public.performance_tests(user_id, test_type, test_date DESC);

-- =============================================================================
-- 5. ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.exercise_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_tests ENABLE ROW LEVEL SECURITY;

-- exercise_library: System exercises readable by all; user exercises only by owner
CREATE POLICY "Users can view system and own exercises"
  ON public.exercise_library FOR SELECT
  USING (is_system = true OR auth.uid() = user_id);

CREATE POLICY "Users can create custom exercises"
  ON public.exercise_library FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_system = false);

CREATE POLICY "Users can update own custom exercises"
  ON public.exercise_library FOR UPDATE
  USING (auth.uid() = user_id AND is_system = false);

CREATE POLICY "Users can delete own custom exercises"
  ON public.exercise_library FOR DELETE
  USING (auth.uid() = user_id AND is_system = false);

-- workouts policies
CREATE POLICY "Users can view own workouts"
  ON public.workouts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workouts"
  ON public.workouts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workouts"
  ON public.workouts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own workouts"
  ON public.workouts FOR DELETE
  USING (auth.uid() = user_id);

-- workout_sets policies
CREATE POLICY "Users can view own workout sets"
  ON public.workout_sets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workout sets"
  ON public.workout_sets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workout sets"
  ON public.workout_sets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own workout sets"
  ON public.workout_sets FOR DELETE
  USING (auth.uid() = user_id);

-- performance_tests policies
CREATE POLICY "Users can view own performance tests"
  ON public.performance_tests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own performance tests"
  ON public.performance_tests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own performance tests"
  ON public.performance_tests FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own performance tests"
  ON public.performance_tests FOR DELETE
  USING (auth.uid() = user_id);
