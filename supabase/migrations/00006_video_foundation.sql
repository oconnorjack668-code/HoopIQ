-- 00006_video_foundation.sql
-- Video upload metadata, consent, asynchronous job queues, and measurement schema

-- =============================================================================
-- 1. VIDEO ASSETS (Private metadata)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.video_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  file_size_bytes bigint NOT NULL CHECK (file_size_bytes > 0 AND file_size_bytes <= 524288000), -- 500MB max
  duration_seconds numeric CHECK (duration_seconds IS NULL OR (duration_seconds > 0 AND duration_seconds <= 300)), -- 5 min max
  mime_type text NOT NULL CHECK (mime_type IN ('video/mp4', 'video/quicktime', 'video/webm')),
  capture_angle text NOT NULL CHECK (capture_angle IN ('fixed_side_right', 'fixed_side_left', 'fixed_front', 'fixed_45_angle')),
  drill_type text NOT NULL CHECK (drill_type IN ('catch_and_shoot', 'free_throw', 'pull_up_jumper', 'form_shooting', 'custom')),
  notes text,
  analysis_status text NOT NULL DEFAULT 'uploaded' CHECK (
    analysis_status IN ('uploaded', 'queued', 'processing', 'completed', 'needs_review', 'failed')
  ),
  consent_given boolean NOT NULL DEFAULT false,
  consent_timestamp timestamptz,
  correlation_id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_video_assets_user_date ON public.video_assets(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_assets_status ON public.video_assets(analysis_status);

-- =============================================================================
-- 2. VIDEO ANALYSIS JOBS (Asynchronous, idempotent)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.video_analysis_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL REFERENCES public.video_assets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_status text NOT NULL DEFAULT 'pending' CHECK (
    job_status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')
  ),
  idempotency_key text UNIQUE NOT NULL,
  attempt_count smallint NOT NULL DEFAULT 0,
  max_attempts smallint NOT NULL DEFAULT 3,
  last_error text,
  correlation_id uuid NOT NULL,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_video_jobs_status ON public.video_analysis_jobs(job_status, created_at);
CREATE INDEX IF NOT EXISTS idx_video_jobs_video_id ON public.video_analysis_jobs(video_id);

-- =============================================================================
-- 3. VIDEO MEASUREMENTS (Biomechanical data points & manual tagging)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.video_measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.video_analysis_jobs(id) ON DELETE CASCADE,
  video_id uuid NOT NULL REFERENCES public.video_assets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shot_number integer NOT NULL CHECK (shot_number > 0),
  frame_number integer,
  timestamp_ms numeric,
  shot_phase text CHECK (shot_phase IS NULL OR shot_phase IN ('dip_load', 'set_point', 'release', 'landing')),
  measurement_type text NOT NULL CHECK (measurement_type IN (
    'knee_bend_angle_deg',
    'elbow_angle_deg',
    'shoulder_alignment_deg',
    'release_angle_deg',
    'release_time_ms',
    'jump_height_inches',
    'landing_symmetry_pct',
    'shot_outcome'
  )),
  value numeric NOT NULL,
  unit text NOT NULL,
  confidence numeric NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  landmarks jsonb,
  shot_outcome text CHECK (shot_outcome IS NULL OR shot_outcome IN ('make', 'miss', 'unconfirmed')),
  player_confirmed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_video_measurements_video_shot ON public.video_measurements(video_id, shot_number);
CREATE INDEX IF NOT EXISTS idx_video_measurements_type ON public.video_measurements(user_id, measurement_type);

-- =============================================================================
-- 4. ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.video_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_analysis_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_measurements ENABLE ROW LEVEL SECURITY;

-- video_assets policies
CREATE POLICY "Users can view own video assets"
  ON public.video_assets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own video assets"
  ON public.video_assets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own video assets"
  ON public.video_assets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own video assets"
  ON public.video_assets FOR DELETE
  USING (auth.uid() = user_id);

-- video_analysis_jobs policies
CREATE POLICY "Users can view own analysis jobs"
  ON public.video_analysis_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analysis jobs"
  ON public.video_analysis_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- video_measurements policies
CREATE POLICY "Users can view own video measurements"
  ON public.video_measurements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own video measurements"
  ON public.video_measurements FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own video measurements"
  ON public.video_measurements FOR INSERT
  WITH CHECK (auth.uid() = user_id);
