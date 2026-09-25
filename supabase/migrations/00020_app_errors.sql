-- 00020_app_errors.sql
-- Crash reports from the app (free, built-in alternative to Sentry).
-- Written and read only by the server (service_role); players have no access.
-- Rows older than 90 days are removed by the daily cron job.

CREATE TABLE IF NOT EXISTS public.app_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  source text NOT NULL CHECK (source IN ('client', 'boundary', 'server')),
  message text NOT NULL CHECK (char_length(message) <= 1000),
  stack text CHECK (char_length(stack) <= 4000),
  digest text CHECK (char_length(digest) <= 100),
  url text CHECK (char_length(url) <= 500),
  user_agent text CHECK (char_length(user_agent) <= 300),
  resolved boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS app_errors_created_idx ON public.app_errors (created_at DESC);

ALTER TABLE public.app_errors ENABLE ROW LEVEL SECURITY;
-- No policies: only service_role (which bypasses RLS) can touch this table.

REVOKE ALL ON public.app_errors FROM anon, authenticated;
GRANT ALL ON public.app_errors TO service_role;
