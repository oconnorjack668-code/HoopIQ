-- 00021_friends_and_coach_chat.sql
-- Round F: friends (friend codes + requests that must be accepted), a friends
-- leaderboard and activity feed that expose only totals (never notes or videos),
-- AI Coach chat history, and the weekly AI report setting. Safe to re-run.

-- =============================================================================
-- 1. FRIEND CODES
-- =============================================================================
-- 6 characters from an alphabet without look-alikes (no 0/O, 1/I/L)
CREATE OR REPLACE FUNCTION public.new_friend_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER -- must see every player's code to avoid duplicates
SET search_path = public
AS $$
DECLARE
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  code text;
BEGIN
  LOOP
    code := '';
    FOR i IN 1..6 LOOP
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE friend_code = code);
  END LOOP;
  RETURN code;
END;
$$;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS friend_code text;
UPDATE public.profiles SET friend_code = public.new_friend_code() WHERE friend_code IS NULL;
ALTER TABLE public.profiles ALTER COLUMN friend_code SET DEFAULT public.new_friend_code();
ALTER TABLE public.profiles ALTER COLUMN friend_code SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_friend_code_key ON public.profiles (friend_code);

-- Players can edit their profile, but not pick their own friend code
CREATE OR REPLACE FUNCTION public.keep_friend_code()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_user = 'authenticated' THEN
    NEW.friend_code := OLD.friend_code;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS profiles_keep_friend_code ON public.profiles;
CREATE TRIGGER profiles_keep_friend_code
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.keep_friend_code();

-- =============================================================================
-- 2. FRIENDSHIPS (changed only through the functions below)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  CHECK (requester_id <> addressee_id)
);
-- One row per pair, whichever direction it was sent
CREATE UNIQUE INDEX IF NOT EXISTS friendships_pair_key
  ON public.friendships (LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id));
CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON public.friendships (addressee_id);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Players see their own friendships" ON public.friendships;
CREATE POLICY "Players see their own friendships" ON public.friendships
  FOR SELECT USING (auth.uid() IN (requester_id, addressee_id));

GRANT SELECT ON public.friendships TO authenticated;
GRANT ALL ON public.friendships TO service_role;
REVOKE ALL ON public.friendships FROM anon;

-- Who owns a friend code (for the "Add friend" screen)
CREATE OR REPLACE FUNCTION public.friend_code_lookup(p_code text)
RETURNS TABLE (user_id uuid, display_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.display_name
  FROM public.profiles p
  WHERE p.friend_code = upper(trim(p_code)) AND auth.uid() IS NOT NULL;
$$;

-- Returns: 'sent', 'accepted' (they had already asked you), 'already', 'self', 'not_found', 'limit'
CREATE OR REPLACE FUNCTION public.send_friend_request(p_code text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  target uuid;
  existing public.friendships%ROWTYPE;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Not logged in'; END IF;
  SELECT id INTO target FROM public.profiles WHERE friend_code = upper(trim(p_code));
  IF target IS NULL THEN RETURN 'not_found'; END IF;
  IF target = me THEN RETURN 'self'; END IF;

  SELECT * INTO existing FROM public.friendships
  WHERE LEAST(requester_id, addressee_id) = LEAST(me, target)
    AND GREATEST(requester_id, addressee_id) = GREATEST(me, target);
  IF FOUND THEN
    IF existing.status = 'pending' AND existing.addressee_id = me THEN
      UPDATE public.friendships SET status = 'accepted', responded_at = now() WHERE id = existing.id;
      RETURN 'accepted';
    END IF;
    RETURN 'already';
  END IF;

  IF (SELECT count(*) FROM public.friendships WHERE requester_id = me AND status = 'pending') >= 50
     OR (SELECT count(*) FROM public.friendships WHERE me IN (requester_id, addressee_id) AND status = 'accepted') >= 300 THEN
    RETURN 'limit';
  END IF;

  INSERT INTO public.friendships (requester_id, addressee_id) VALUES (me, target);
  RETURN 'sent';
END;
$$;

-- Accept or decline a request sent to you
CREATE OR REPLACE FUNCTION public.respond_friend_request(p_friendship_id uuid, p_accept boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_accept THEN
    UPDATE public.friendships SET status = 'accepted', responded_at = now()
    WHERE id = p_friendship_id AND addressee_id = auth.uid() AND status = 'pending';
  ELSE
    DELETE FROM public.friendships
    WHERE id = p_friendship_id AND addressee_id = auth.uid() AND status = 'pending';
  END IF;
END;
$$;

-- Unfriend, cancel a request you sent, or remove a request
CREATE OR REPLACE FUNCTION public.remove_friendship(p_friendship_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.friendships WHERE id = p_friendship_id AND auth.uid() IN (requester_id, addressee_id);
$$;

-- =============================================================================
-- 3. FRIENDS LEADERBOARD + FEED (totals only)
-- =============================================================================
-- Consecutive training days ending today or yesterday (hoops or gym)
CREATE OR REPLACE FUNCTION public.training_streak(p_user uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH days AS (
    SELECT session_date AS day FROM public.training_sessions WHERE user_id = p_user AND session_date >= current_date - 400
    UNION
    SELECT workout_date FROM public.workouts WHERE user_id = p_user AND workout_date >= current_date - 400
  ),
  islands AS (
    SELECT day, day - (row_number() OVER (ORDER BY day))::int AS grp FROM days
  ),
  latest AS (SELECT max(day) AS day FROM days)
  SELECT COALESCE((
    SELECT count(*)::int FROM islands
    WHERE grp = (SELECT i.grp FROM islands i, latest l WHERE i.day = l.day)
      AND (SELECT day FROM latest) >= current_date - 1
  ), 0);
$$;

CREATE OR REPLACE FUNCTION public.friends_overview()
RETURNS TABLE (
  friendship_id uuid,
  user_id uuid,
  display_name text,
  avatar_url text,
  player_position text,
  status text,
  is_me boolean,
  sessions_7d integer,
  workouts_7d integer,
  minutes_7d integer,
  makes_7d integer,
  attempts_7d integer,
  streak integer,
  last_active date
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH rel AS (
    SELECT f.id,
      CASE WHEN f.requester_id = auth.uid() THEN f.addressee_id ELSE f.requester_id END AS other,
      CASE WHEN f.status = 'accepted' THEN 'friend' WHEN f.requester_id = auth.uid() THEN 'outgoing' ELSE 'incoming' END AS status
    FROM public.friendships f
    WHERE auth.uid() IN (f.requester_id, f.addressee_id)
    UNION ALL
    -- The player themself, so the friends leaderboard includes "you"
    SELECT NULL::uuid, auth.uid(), 'me' WHERE auth.uid() IS NOT NULL
  ),
  shown AS (
    SELECT rel.*, rel.status IN ('friend', 'me') AS has_stats FROM rel
  )
  SELECT
    s.id,
    s.other,
    p.display_name,
    p.avatar_url,
    p.position,
    CASE WHEN s.status = 'me' THEN 'friend' ELSE s.status END,
    s.status = 'me',
    CASE WHEN s.has_stats THEN (SELECT count(*)::int FROM public.training_sessions t WHERE t.user_id = s.other AND t.session_date >= current_date - 6) END,
    CASE WHEN s.has_stats THEN (SELECT count(*)::int FROM public.workouts w WHERE w.user_id = s.other AND w.workout_date >= current_date - 6) END,
    CASE WHEN s.has_stats THEN (
      (SELECT COALESCE(sum(t.duration_minutes), 0)::int FROM public.training_sessions t WHERE t.user_id = s.other AND t.session_date >= current_date - 6)
      + (SELECT COALESCE(sum(w.duration_minutes), 0)::int FROM public.workouts w WHERE w.user_id = s.other AND w.workout_date >= current_date - 6)
    ) END,
    CASE WHEN s.has_stats THEN (
      SELECT COALESCE(sum(e.makes), 0)::int FROM public.shooting_entries e
      JOIN public.session_drills d ON d.id = e.drill_id
      JOIN public.training_sessions t ON t.id = d.session_id
      WHERE e.user_id = s.other AND t.session_date >= current_date - 6
    ) END,
    CASE WHEN s.has_stats THEN (
      SELECT COALESCE(sum(e.attempts), 0)::int FROM public.shooting_entries e
      JOIN public.session_drills d ON d.id = e.drill_id
      JOIN public.training_sessions t ON t.id = d.session_id
      WHERE e.user_id = s.other AND t.session_date >= current_date - 6
    ) END,
    CASE WHEN s.has_stats THEN public.training_streak(s.other) END,
    CASE WHEN s.has_stats THEN GREATEST(
      (SELECT max(t.session_date) FROM public.training_sessions t WHERE t.user_id = s.other),
      (SELECT max(w.workout_date) FROM public.workouts w WHERE w.user_id = s.other)
    ) END
  FROM shown s
  JOIN public.profiles p ON p.id = s.other;
$$;

CREATE OR REPLACE FUNCTION public.friend_feed(p_limit integer DEFAULT 30)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  kind text,
  happened_on date,
  created_at timestamptz,
  title text,
  detail text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH friends AS (
    SELECT CASE WHEN requester_id = auth.uid() THEN addressee_id ELSE requester_id END AS id
    FROM public.friendships
    WHERE status = 'accepted' AND auth.uid() IN (requester_id, addressee_id)
  )
  SELECT * FROM (
    SELECT t.user_id, p.display_name, 'hoops'::text, t.session_date, t.created_at,
      initcap(replace(t.session_type, '-', ' ')) || ' session',
      concat_ws(' · ', t.duration_minutes || ' min',
        CASE WHEN sh.attempts > 0 THEN sh.makes || '/' || sh.attempts || ' shots (' || round(100.0 * sh.makes / sh.attempts) || '%)' END)
    FROM public.training_sessions t
    JOIN friends f ON f.id = t.user_id
    JOIN public.profiles p ON p.id = t.user_id
    LEFT JOIN LATERAL (
      SELECT COALESCE(sum(e.makes), 0)::int AS makes, COALESCE(sum(e.attempts), 0)::int AS attempts
      FROM public.session_drills d JOIN public.shooting_entries e ON e.drill_id = d.id
      WHERE d.session_id = t.id
    ) sh ON true
    WHERE t.session_date >= current_date - 13
    UNION ALL
    SELECT w.user_id, p.display_name, 'gym'::text, w.workout_date, w.created_at,
      initcap(replace(w.workout_type, '_', ' ')) || ' workout',
      concat_ws(' · ', w.duration_minutes || ' min', (SELECT count(*) FROM public.workout_sets ws WHERE ws.workout_id = w.id) || ' sets')
    FROM public.workouts w
    JOIN friends f ON f.id = w.user_id
    JOIN public.profiles p ON p.id = w.user_id
    WHERE w.workout_date >= current_date - 13
    UNION ALL
    SELECT r.user_id, p.display_name, 'badge'::text, r.created_at::date, r.created_at,
      'Earned the ' || r.badge_title || ' badge', r.badge_description
    FROM public.reward_events r
    JOIN friends f ON f.id = r.user_id
    JOIN public.profiles p ON p.id = r.user_id
    WHERE r.event_type = 'badge_earned' AND r.created_at >= now() - interval '14 days'
  ) feed
  ORDER BY 5 DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 30), 1), 100);
$$;

-- Supabase grants EXECUTE to everyone by default: lock these down
-- new_friend_code is the column default, and onboarding's profile upsert evaluates it
REVOKE EXECUTE ON FUNCTION public.new_friend_code() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.new_friend_code() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.keep_friend_code() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.training_streak(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.friend_code_lookup(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.send_friend_request(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.respond_friend_request(uuid, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.remove_friendship(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.friends_overview() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.friend_feed(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.friend_code_lookup(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_friend_request(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_friend_request(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_friendship(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.friends_overview() TO authenticated;
GRANT EXECUTE ON FUNCTION public.friend_feed(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.new_friend_code() TO service_role;
GRANT EXECUTE ON FUNCTION public.training_streak(uuid) TO service_role;

-- =============================================================================
-- 4. AI COACH CHAT (written by the server only, so replies can't be faked)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.coach_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 4000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_coach_messages_user_time ON public.coach_messages (user_id, created_at DESC);

ALTER TABLE public.coach_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Players read own coach chat" ON public.coach_messages;
CREATE POLICY "Players read own coach chat" ON public.coach_messages
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Players clear own coach chat" ON public.coach_messages;
CREATE POLICY "Players clear own coach chat" ON public.coach_messages
  FOR DELETE USING (auth.uid() = user_id);

GRANT SELECT, DELETE ON public.coach_messages TO authenticated;
GRANT ALL ON public.coach_messages TO service_role;
REVOKE ALL ON public.coach_messages FROM anon;

-- =============================================================================
-- 5. WEEKLY AI REPORT SETTING
-- =============================================================================
ALTER TABLE public.notification_preferences ADD COLUMN IF NOT EXISTS weekly_report boolean NOT NULL DEFAULT true;
ALTER TABLE public.notification_preferences ADD COLUMN IF NOT EXISTS last_weekly_report_on date;
