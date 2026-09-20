-- 00002_training_and_basketball.sql
-- Basketball training sessions, drills, and shooting entries

-- =============================================================================
-- 1. TRAINING SESSIONS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.training_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_date date NOT NULL DEFAULT CURRENT_DATE,
  session_type text NOT NULL CHECK (session_type IN ('shooting', 'ball-handling', 'footwork', 'scrimmage', 'pickup', 'skills', 'game', 'mixed')),
  duration_minutes integer NOT NULL CHECK (duration_minutes > 0 AND duration_minutes <= 600),
  intensity_rpe smallint NOT NULL CHECK (intensity_rpe BETWEEN 1 AND 10),
  perceived_quality smallint NOT NULL CHECK (perceived_quality BETWEEN 1 AND 5),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_training_sessions_user_date ON public.training_sessions(user_id, session_date DESC);
CREATE INDEX IF NOT EXISTS idx_training_sessions_user_type ON public.training_sessions(user_id, session_type);

-- =============================================================================
-- 2. SESSION DRILLS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.session_drills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  drill_name text NOT NULL,
  drill_category text NOT NULL CHECK (drill_category IN ('shooting', 'ball-handling', 'finishing', 'footwork', 'defense', 'conditioning', 'passing', 'other')),
  duration_minutes integer CHECK (duration_minutes IS NULL OR duration_minutes >= 0),
  notes text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_session_drills_session_id ON public.session_drills(session_id);
CREATE INDEX IF NOT EXISTS idx_session_drills_user_id ON public.session_drills(user_id);

-- =============================================================================
-- 3. SHOOTING ENTRIES
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.shooting_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drill_id uuid NOT NULL REFERENCES public.session_drills(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shot_zone text NOT NULL CHECK (shot_zone IN (
    'paint',
    'free-throw',
    'mid-left-corner',
    'mid-left-wing',
    'mid-center',
    'mid-right-wing',
    'mid-right-corner',
    'three-left-corner',
    'three-left-wing',
    'three-top',
    'three-right-wing',
    'three-right-corner',
    'deep-three',
    'all-around'
  )),
  shot_type text CHECK (shot_type IS NULL OR shot_type IN ('catch-and-shoot', 'off-the-dribble', 'step-back', 'free-throw', 'floater', 'pull-up', 'spot-up')),
  makes integer NOT NULL DEFAULT 0 CHECK (makes >= 0),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0 AND attempts >= makes),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shooting_entries_drill_id ON public.shooting_entries(drill_id);
CREATE INDEX IF NOT EXISTS idx_shooting_entries_user_zone ON public.shooting_entries(user_id, shot_zone);

-- =============================================================================
-- 4. ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_drills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shooting_entries ENABLE ROW LEVEL SECURITY;

-- training_sessions policies
CREATE POLICY "Users can view own training sessions"
  ON public.training_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own training sessions"
  ON public.training_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own training sessions"
  ON public.training_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own training sessions"
  ON public.training_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- session_drills policies
CREATE POLICY "Users can view own session drills"
  ON public.session_drills FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own session drills"
  ON public.session_drills FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own session drills"
  ON public.session_drills FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own session drills"
  ON public.session_drills FOR DELETE
  USING (auth.uid() = user_id);

-- shooting_entries policies
CREATE POLICY "Users can view own shooting entries"
  ON public.shooting_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own shooting entries"
  ON public.shooting_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own shooting entries"
  ON public.shooting_entries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own shooting entries"
  ON public.shooting_entries FOR DELETE
  USING (auth.uid() = user_id);
