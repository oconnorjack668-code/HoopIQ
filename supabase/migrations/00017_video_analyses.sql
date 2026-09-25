-- 00017_video_analyses.sql
-- Results of on-device video analysis (shot tracking, form checks, game film
-- tagging). The videos themselves stay on the player's phone; only these
-- numbers are saved. Safe to re-run.

CREATE TABLE IF NOT EXISTS public.video_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('shot_tracking', 'form_check', 'game_film')),
  session_id uuid REFERENCES public.training_sessions(id) ON DELETE SET NULL,
  summary jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_video_analyses_user ON public.video_analyses(user_id, created_at DESC);

ALTER TABLE public.video_analyses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own video analyses" ON public.video_analyses;
CREATE POLICY "Users manage own video analyses" ON public.video_analyses
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_analyses TO authenticated;
GRANT ALL ON public.video_analyses TO service_role;
REVOKE ALL ON public.video_analyses FROM anon;
