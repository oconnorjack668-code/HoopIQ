-- 00004_goals_and_ai.sql
-- Goals, streaks, and traceable AI reports

-- =============================================================================
-- 1. GOALS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_type text NOT NULL CHECK (goal_type IN ('weekly_training_days', 'weekly_makes', 'shooting_pct', 'strength_days', 'iq_study_items', 'custom')),
  target_value integer NOT NULL CHECK (target_value > 0),
  current_value integer NOT NULL DEFAULT 0,
  period text NOT NULL DEFAULT 'weekly' CHECK (period IN ('weekly', 'monthly', 'season')),
  title text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_goals_user_active ON public.goals(user_id, is_active);

-- =============================================================================
-- 2. AI REPORTS (Traceable, structured input & versioned prompt output)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.ai_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_type text NOT NULL CHECK (report_type IN ('post_session', 'weekly_summary', 'development_plan', 'trend_analysis')),
  input_data jsonb NOT NULL,
  input_version text NOT NULL DEFAULT '1.0',
  provider text NOT NULL,
  model text NOT NULL,
  prompt_version text NOT NULL DEFAULT '1.0',
  output_content jsonb NOT NULL, -- structured summary, comparison, suggestions
  confidence_score numeric CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1)),
  status text NOT NULL DEFAULT 'delivered' CHECK (status IN ('generated', 'delivered', 'needs_review', 'held', 'failed')),
  source_session_ids uuid[] DEFAULT '{}',
  correlation_id uuid DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_reports_user_date ON public.ai_reports(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_reports_correlation_id ON public.ai_reports(correlation_id);

-- =============================================================================
-- 3. ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_reports ENABLE ROW LEVEL SECURITY;

-- goals policies
CREATE POLICY "Users can view own goals"
  ON public.goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own goals"
  ON public.goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals"
  ON public.goals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own goals"
  ON public.goals FOR DELETE
  USING (auth.uid() = user_id);

-- ai_reports policies (Read-only for user; inserts via server action / service role)
CREATE POLICY "Users can view own AI reports"
  ON public.ai_reports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own AI reports"
  ON public.ai_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);
