-- 00028_daily_iq.sql
--
-- One Basketball IQ question per player per day.
--
-- The IQ section is finite, so a player who works through it has nothing left.
-- Adding more lessons only moves that day further out. What removes it is that
-- questions keep coming back: the app walks a per-player shuffle of the whole
-- pool, one question a day, so every question is seen once before any repeats -
-- a few hundred questions becomes a few hundred days.
--
-- This table records what was answered, so the question is fixed once answered,
-- the result can be shown back, and a daily-question streak is possible.
--
-- SAFE TO RE-RUN.

CREATE TABLE IF NOT EXISTS public.daily_iq_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- The player's own calendar date, same convention as session_date
  answer_date date NOT NULL,
  -- Which question was asked: a lesson, and an index into its quiz_questions
  item_id uuid NOT NULL REFERENCES public.study_items(id) ON DELETE CASCADE,
  question_index smallint NOT NULL CHECK (question_index >= 0 AND question_index < 100),
  chosen_index smallint NOT NULL CHECK (chosen_index >= 0 AND chosen_index < 100),
  was_correct boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  -- One answer per player per day. The first answer stands; there is no second
  -- go at today's question.
  CONSTRAINT daily_iq_one_per_day UNIQUE (user_id, answer_date)
);

-- "Did I answer today?" and "how long is my run?" both read newest first
CREATE INDEX IF NOT EXISTS idx_daily_iq_user_date ON public.daily_iq_answers (user_id, answer_date DESC);
-- Account deletion cascades through study_items
CREATE INDEX IF NOT EXISTS idx_daily_iq_item ON public.daily_iq_answers (item_id);

ALTER TABLE public.daily_iq_answers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own daily IQ answers" ON public.daily_iq_answers;
CREATE POLICY "Users manage own daily IQ answers" ON public.daily_iq_answers
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT ON public.daily_iq_answers TO authenticated;
-- Deliberately no UPDATE or DELETE for players: an answer, once given, stands.
GRANT ALL ON public.daily_iq_answers TO service_role;
