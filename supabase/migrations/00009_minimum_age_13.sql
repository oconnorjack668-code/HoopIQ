-- 00009_minimum_age_13.sql
-- HoopIQ is for players aged 13 and over (avoids collecting data from under-13s,
-- which would need verified parental consent under COPPA).
-- Replaces the 'under-14' age bracket with '13'. Safe to re-run.

-- 'under-14' could include under-13s, so those answers are cleared rather than guessed;
-- the player can pick their bracket again in Profile -> Edit player info.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_age_bracket_check;

UPDATE public.profiles SET age_bracket = NULL WHERE age_bracket = 'under-14';

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_age_bracket_check
  CHECK (age_bracket IN ('13', '14-17', '18-22', '23-30', '30+'));
