-- 00010_measurement_system.sql
-- Each player chooses imperial (ft/in, lbs) or metric (cm, kg).
-- Values are still stored in metric (height_cm, weight_kg); the app converts for display/input.
-- Safe to re-run.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS measurement_system text NOT NULL DEFAULT 'imperial';

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_measurement_system_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_measurement_system_check
  CHECK (measurement_system IN ('imperial', 'metric'));
