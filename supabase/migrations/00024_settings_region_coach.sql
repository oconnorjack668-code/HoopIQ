-- 00024_settings_region_coach.sql
-- Round H: privacy settings (private by default), region + time zone, player/coach role,
-- player-controlled sharing with coaches, team details, and a fast leaderboard with
-- country / county / friends / team / age-group filters worked out on each player's calendar.
-- Safe to re-run.

-- =============================================================================
-- 1. PROFILE SETTINGS
-- =============================================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS region text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS timezone text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_role text NOT NULL DEFAULT 'player';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS show_position boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS show_height boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS show_location boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS allow_friend_requests boolean NOT NULL DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS share_with_coaches boolean NOT NULL DEFAULT false;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_country_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_country_check CHECK (country IS NULL OR country ~ '^[A-Z]{2}$');
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_region_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_region_check CHECK (region IS NULL OR char_length(region) BETWEEN 1 AND 60);
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_timezone_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_timezone_check CHECK (timezone IS NULL OR char_length(timezone) BETWEEN 1 AND 64);
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_account_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_account_role_check CHECK (account_role IN ('player', 'coach', 'both'));
CREATE INDEX IF NOT EXISTS idx_profiles_country_region ON public.profiles (country, lower(region));

-- Only real time zones (the database must understand them to work out each player's "today")
CREATE OR REPLACE FUNCTION public.check_profile_timezone()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.timezone IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = NEW.timezone) THEN
    RAISE EXCEPTION 'Unknown time zone: %', NEW.timezone;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS profiles_check_timezone ON public.profiles;
CREATE TRIGGER profiles_check_timezone
  BEFORE INSERT OR UPDATE OF timezone ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.check_profile_timezone();
REVOKE EXECUTE ON FUNCTION public.check_profile_timezone() FROM PUBLIC, anon, authenticated;

-- Existing players: take the time zone their phone reported when they set up reminders
UPDATE public.profiles p
SET timezone = n.timezone
FROM public.notification_preferences n
WHERE n.user_id = p.id
  AND p.timezone IS NULL
  AND EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = n.timezone);

-- Profiles are now private: other players only ever see what the functions below return
-- (display name + the fields each player chooses to show). Age is never shown to others.
DROP POLICY IF EXISTS "Users can view own profile or public profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- The player's calendar: time zone falls back to Ireland
CREATE OR REPLACE FUNCTION public.player_today(p_user uuid)
RETURNS date
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (now() AT TIME ZONE COALESCE(
    (SELECT tz.name FROM public.profiles p JOIN pg_timezone_names tz ON tz.name = p.timezone WHERE p.id = p_user),
    'Europe/Dublin'
  ))::date;
$$;
REVOKE EXECUTE ON FUNCTION public.player_today(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.player_today(uuid) TO service_role;

-- Leaderboard age groups (age itself is never shown to other players)
CREATE OR REPLACE FUNCTION public.age_group(p_bracket text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE WHEN p_bracket = '13' THEN 'u14' WHEN p_bracket = '14-17' THEN '14-17' WHEN p_bracket IS NULL THEN NULL ELSE '18+' END;
$$;

-- =============================================================================
-- 2. FRIEND REQUESTS RESPECT "allow friend requests"
-- =============================================================================
-- Returns: 'sent', 'accepted', 'already', 'self', 'not_found', 'limit', 'closed'
CREATE OR REPLACE FUNCTION public.send_friend_request(p_code text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  target uuid;
  target_open boolean;
  existing public.friendships%ROWTYPE;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Not logged in'; END IF;
  SELECT id, allow_friend_requests INTO target, target_open FROM public.profiles WHERE friend_code = upper(trim(p_code));
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

  IF NOT target_open THEN RETURN 'closed'; END IF;

  IF (SELECT count(*) FROM public.friendships WHERE requester_id = me AND status = 'pending') >= 50
     OR (SELECT count(*) FROM public.friendships WHERE me IN (requester_id, addressee_id) AND status = 'accepted') >= 300 THEN
    RETURN 'limit';
  END IF;

  INSERT INTO public.friendships (requester_id, addressee_id) VALUES (me, target);
  RETURN 'sent';
END;
$$;
REVOKE EXECUTE ON FUNCTION public.send_friend_request(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_friend_request(text) TO authenticated;

-- Friends see position only if the player chose to show it
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
    CASE WHEN s.status = 'me' OR p.show_position THEN p.position END,
    CASE WHEN s.status = 'me' THEN 'friend' ELSE s.status END,
    s.status = 'me',
    CASE WHEN s.has_stats THEN (SELECT count(*)::int FROM public.training_sessions t WHERE t.user_id = s.other AND t.session_date >= public.player_today(s.other) - 6) END,
    CASE WHEN s.has_stats THEN (SELECT count(*)::int FROM public.workouts w WHERE w.user_id = s.other AND w.workout_date >= public.player_today(s.other) - 6) END,
    CASE WHEN s.has_stats THEN (
      (SELECT COALESCE(sum(t.duration_minutes), 0)::int FROM public.training_sessions t WHERE t.user_id = s.other AND t.session_date >= public.player_today(s.other) - 6)
      + (SELECT COALESCE(sum(w.duration_minutes), 0)::int FROM public.workouts w WHERE w.user_id = s.other AND w.workout_date >= public.player_today(s.other) - 6)
    ) END,
    CASE WHEN s.has_stats THEN (
      SELECT COALESCE(sum(e.makes), 0)::int FROM public.shooting_entries e
      JOIN public.session_drills d ON d.id = e.drill_id
      JOIN public.training_sessions t ON t.id = d.session_id
      WHERE e.user_id = s.other AND t.session_date >= public.player_today(s.other) - 6
    ) END,
    CASE WHEN s.has_stats THEN (
      SELECT COALESCE(sum(e.attempts), 0)::int FROM public.shooting_entries e
      JOIN public.session_drills d ON d.id = e.drill_id
      JOIN public.training_sessions t ON t.id = d.session_id
      WHERE e.user_id = s.other AND t.session_date >= public.player_today(s.other) - 6
    ) END,
    CASE WHEN s.has_stats THEN public.training_streak(s.other) END,
    CASE WHEN s.has_stats THEN GREATEST(
      (SELECT max(t.session_date) FROM public.training_sessions t WHERE t.user_id = s.other),
      (SELECT max(w.workout_date) FROM public.workouts w WHERE w.user_id = s.other)
    ) END
  FROM shown s
  JOIN public.profiles p ON p.id = s.other;
$$;
REVOKE EXECUTE ON FUNCTION public.friends_overview() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.friends_overview() TO authenticated;

-- Streak ending on the player's own "today" or yesterday
CREATE OR REPLACE FUNCTION public.training_streak(p_user uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH today AS (SELECT public.player_today(p_user) AS d),
  days AS (
    SELECT session_date AS day FROM public.training_sessions, today WHERE user_id = p_user AND session_date BETWEEN today.d - 400 AND today.d
    UNION
    SELECT workout_date FROM public.workouts, today WHERE user_id = p_user AND workout_date BETWEEN today.d - 400 AND today.d
  ),
  islands AS (
    SELECT day, day - (row_number() OVER (ORDER BY day))::int AS grp FROM days
  ),
  latest AS (SELECT max(day) AS day FROM days)
  SELECT COALESCE((
    SELECT count(*)::int FROM islands
    WHERE grp = (SELECT i.grp FROM islands i, latest l WHERE i.day = l.day)
      AND (SELECT day FROM latest) >= (SELECT d FROM today) - 1
  ), 0);
$$;
REVOKE EXECUTE ON FUNCTION public.training_streak(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.training_streak(uuid) TO service_role;

-- =============================================================================
-- 3. TEAMS: DETAILS, SHARING WITH COACHES, COACH VIEW OF A PLAYER
-- =============================================================================
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS club_name text;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS region text;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS age_group text;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS level text;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS season text;
ALTER TABLE public.teams DROP CONSTRAINT IF EXISTS teams_details_check;
ALTER TABLE public.teams ADD CONSTRAINT teams_details_check CHECK (
  (club_name IS NULL OR char_length(club_name) BETWEEN 1 AND 80)
  AND (country IS NULL OR country ~ '^[A-Z]{2}$')
  AND (region IS NULL OR char_length(region) BETWEEN 1 AND 60)
  AND (age_group IS NULL OR age_group IN ('U10', 'U12', 'U14', 'U16', 'U18', 'U20', 'Senior', 'Masters', 'Mixed'))
  AND (level IS NULL OR level IN ('recreational', 'school', 'club', 'regional', 'national', 'elite'))
  AND (season IS NULL OR char_length(season) BETWEEN 1 AND 20)
);
-- 00008 gives signed-in users table-wide rights on every new table, so without this a coach
-- could also change the join code or creator. Only these columns are editable (by coaches, via RLS).
REVOKE UPDATE ON public.teams FROM authenticated;
GRANT UPDATE (name, club_name, country, region, age_group, level, season) ON public.teams TO authenticated;

-- Each player decides whether this team's coaches can see their detailed training
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS share_details boolean NOT NULL DEFAULT false;
DROP POLICY IF EXISTS "Players choose what they share" ON public.team_members;
CREATE POLICY "Players choose what they share" ON public.team_members
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
-- Players may change only their sharing choice, never their role or team
REVOKE UPDATE ON public.team_members FROM authenticated;
GRANT UPDATE (share_details) ON public.team_members TO authenticated;

-- Joining uses the player's default sharing choice from Settings
CREATE OR REPLACE FUNCTION public.join_team(p_code text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  target uuid;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Not logged in'; END IF;
  SELECT id INTO target FROM public.teams WHERE join_code = upper(trim(p_code));
  IF target IS NULL THEN RETURN 'not_found'; END IF;
  IF EXISTS (SELECT 1 FROM public.team_members WHERE team_id = target AND user_id = me) THEN RETURN 'already'; END IF;
  IF (SELECT count(*) FROM public.team_members WHERE team_id = target) >= 60 THEN RETURN 'full'; END IF;
  INSERT INTO public.team_members (team_id, user_id, role, share_details)
  VALUES (target, me, 'player', COALESCE((SELECT share_with_coaches FROM public.profiles WHERE id = me), false));
  RETURN 'joined';
END;
$$;
REVOKE EXECUTE ON FUNCTION public.join_team(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_team(text) TO authenticated;

-- Roster now also says who shares details, and respects "show position"
DROP FUNCTION IF EXISTS public.team_roster(uuid);
CREATE FUNCTION public.team_roster(p_team uuid)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  player_position text,
  role text,
  share_details boolean,
  sessions_7d integer,
  workouts_7d integer,
  minutes_7d integer,
  makes_7d integer,
  attempts_7d integer,
  sessions_28d integer,
  streak integer,
  last_active date,
  games integer,
  ppg numeric,
  rpg numeric,
  apg numeric,
  fg_pct numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    m.user_id,
    p.display_name,
    CASE WHEN p.show_position OR m.share_details OR m.user_id = auth.uid() THEN p.position END,
    m.role,
    m.share_details,
    (SELECT count(*)::int FROM public.training_sessions t WHERE t.user_id = m.user_id AND t.session_date >= public.player_today(m.user_id) - 6),
    (SELECT count(*)::int FROM public.workouts w WHERE w.user_id = m.user_id AND w.workout_date >= public.player_today(m.user_id) - 6),
    (SELECT COALESCE(sum(t.duration_minutes), 0)::int FROM public.training_sessions t WHERE t.user_id = m.user_id AND t.session_date >= public.player_today(m.user_id) - 6)
      + (SELECT COALESCE(sum(w.duration_minutes), 0)::int FROM public.workouts w WHERE w.user_id = m.user_id AND w.workout_date >= public.player_today(m.user_id) - 6),
    (SELECT COALESCE(sum(e.makes), 0)::int FROM public.shooting_entries e
      JOIN public.session_drills d ON d.id = e.drill_id JOIN public.training_sessions t ON t.id = d.session_id
      WHERE e.user_id = m.user_id AND t.session_date >= public.player_today(m.user_id) - 6),
    (SELECT COALESCE(sum(e.attempts), 0)::int FROM public.shooting_entries e
      JOIN public.session_drills d ON d.id = e.drill_id JOIN public.training_sessions t ON t.id = d.session_id
      WHERE e.user_id = m.user_id AND t.session_date >= public.player_today(m.user_id) - 6),
    (SELECT count(*)::int FROM public.training_sessions t WHERE t.user_id = m.user_id AND t.session_date >= public.player_today(m.user_id) - 27)
      + (SELECT count(*)::int FROM public.workouts w WHERE w.user_id = m.user_id AND w.workout_date >= public.player_today(m.user_id) - 27),
    public.training_streak(m.user_id),
    GREATEST(
      (SELECT max(t.session_date) FROM public.training_sessions t WHERE t.user_id = m.user_id),
      (SELECT max(w.workout_date) FROM public.workouts w WHERE w.user_id = m.user_id)
    ),
    g.n,
    g.ppg,
    g.rpg,
    g.apg,
    g.fg_pct
  FROM public.team_members m
  JOIN public.profiles p ON p.id = m.user_id
  LEFT JOIN LATERAL (
    SELECT count(*)::int AS n,
      round(avg(points), 1) AS ppg,
      round(avg(oreb + dreb), 1) AS rpg,
      round(avg(ast), 1) AS apg,
      CASE WHEN sum(fga2 + fga3) > 0 THEN round(100.0 * sum(fgm2 + fgm3) / sum(fga2 + fga3), 1) END AS fg_pct
    FROM public.games gm
    WHERE gm.user_id = m.user_id AND gm.game_date >= public.player_today(m.user_id) - 365
  ) g ON true
  WHERE m.team_id = p_team AND public.is_team_member(p_team, auth.uid());
$$;
REVOKE EXECUTE ON FUNCTION public.team_roster(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.team_roster(uuid) TO authenticated;

-- A coach's detailed view of one player: only when that player shares with this team
-- (or when players look at their own). Notes and videos are never included.
CREATE OR REPLACE FUNCTION public.coach_player_detail(p_team uuid, p_user uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  today date := public.player_today(p_user);
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_team_member(p_team, p_user) THEN RETURN NULL; END IF;
  IF NOT (
    p_user = auth.uid()
    OR (public.is_team_coach(p_team, auth.uid())
        AND EXISTS (SELECT 1 FROM public.team_members WHERE team_id = p_team AND user_id = p_user AND share_details))
  ) THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'profile', (
      SELECT jsonb_build_object('display_name', display_name, 'position', position, 'height_cm', height_cm,
        'dominant_hand', dominant_hand, 'playing_level', playing_level)
      FROM public.profiles WHERE id = p_user
    ),
    'sessions', COALESCE((
      SELECT jsonb_agg(x ORDER BY x.session_date DESC, x.created_at DESC) FROM (
        SELECT t.session_date, t.created_at, t.session_type, t.duration_minutes, t.intensity_rpe,
          COALESCE(sum(e.makes), 0)::int AS makes, COALESCE(sum(e.attempts), 0)::int AS attempts
        FROM public.training_sessions t
        LEFT JOIN public.session_drills d ON d.session_id = t.id
        LEFT JOIN public.shooting_entries e ON e.drill_id = d.id
        WHERE t.user_id = p_user AND t.session_date >= today - 27
        GROUP BY t.id
        ORDER BY t.session_date DESC
        LIMIT 40
      ) x
    ), '[]'::jsonb),
    'zones', COALESCE((
      SELECT jsonb_agg(z ORDER BY z.attempts DESC) FROM (
        SELECT e.shot_zone, sum(e.makes)::int AS makes, sum(e.attempts)::int AS attempts
        FROM public.shooting_entries e
        JOIN public.session_drills d ON d.id = e.drill_id
        JOIN public.training_sessions t ON t.id = d.session_id
        WHERE e.user_id = p_user AND t.session_date >= today - 29
        GROUP BY e.shot_zone
      ) z
    ), '[]'::jsonb),
    'workouts', COALESCE((
      SELECT jsonb_agg(w ORDER BY w.workout_date DESC) FROM (
        SELECT wo.workout_date, wo.workout_type, wo.duration_minutes, wo.rpe,
          (SELECT count(*)::int FROM public.workout_sets s WHERE s.workout_id = wo.id) AS sets,
          (SELECT count(*)::int FROM public.workout_sets s WHERE s.workout_id = wo.id AND s.is_personal_record) AS prs
        FROM public.workouts wo
        WHERE wo.user_id = p_user AND wo.workout_date >= today - 27
        ORDER BY wo.workout_date DESC
        LIMIT 40
      ) w
    ), '[]'::jsonb),
    'tests', COALESCE((
      SELECT jsonb_agg(t ORDER BY t.test_type) FROM (
        SELECT DISTINCT ON (pt.test_type, pt.custom_test_name) pt.test_type, pt.custom_test_name, pt.value, pt.unit, pt.test_date
        FROM public.performance_tests pt
        WHERE pt.user_id = p_user
        ORDER BY pt.test_type, pt.custom_test_name, pt.test_date DESC, pt.created_at DESC
      ) t
    ), '[]'::jsonb),
    'games', COALESCE((
      SELECT jsonb_agg(g ORDER BY g.game_date DESC) FROM (
        SELECT game_date, opponent, result, minutes, points, fgm2, fga2, fgm3, fga3, ftm, fta, oreb, dreb, ast, stl, blk, tov
        FROM public.games WHERE user_id = p_user
        ORDER BY game_date DESC, created_at DESC
        LIMIT 10
      ) g
    ), '[]'::jsonb),
    'assignments', COALESCE((
      SELECT jsonb_agg(a ORDER BY a.created_at DESC) FROM (
        SELECT ta.title, ta.due_date, ta.created_at,
          EXISTS (SELECT 1 FROM public.team_assignment_completions c WHERE c.assignment_id = ta.id AND c.user_id = p_user) AS done
        FROM public.team_assignments ta
        WHERE ta.team_id = p_team
        ORDER BY ta.created_at DESC
        LIMIT 30
      ) a
    ), '[]'::jsonb)
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.coach_player_detail(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.coach_player_detail(uuid, uuid) TO authenticated;

-- =============================================================================
-- 4. PLAYER CARD (what another player may see about someone)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.player_card(p_user uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  p public.profiles%ROWTYPE;
  is_friend boolean;
  teammate boolean;
  self boolean;
BEGIN
  IF me IS NULL THEN RETURN NULL; END IF;
  SELECT * INTO p FROM public.profiles WHERE id = p_user;
  IF NOT FOUND THEN RETURN NULL; END IF;
  self := p_user = me;
  is_friend := EXISTS (
    SELECT 1 FROM public.friendships
    WHERE status = 'accepted' AND LEAST(requester_id, addressee_id) = LEAST(me, p_user) AND GREATEST(requester_id, addressee_id) = GREATEST(me, p_user)
  );
  teammate := EXISTS (
    SELECT 1 FROM public.team_members a JOIN public.team_members b ON b.team_id = a.team_id
    WHERE a.user_id = me AND b.user_id = p_user
  );
  -- Visible to: themselves, friends, teammates, or anyone if they're on the public leaderboard
  IF NOT (self OR is_friend OR teammate OR p.is_public) THEN RETURN NULL; END IF;

  RETURN jsonb_build_object(
    'user_id', p.id,
    'display_name', p.display_name,
    'is_me', self,
    'is_friend', is_friend,
    'position', CASE WHEN self OR p.show_position THEN p.position END,
    'height_cm', CASE WHEN self OR p.show_height THEN p.height_cm END,
    'country', CASE WHEN self OR p.show_location THEN p.country END,
    'region', CASE WHEN self OR p.show_location THEN p.region END,
    'badges', (SELECT count(*)::int FROM public.reward_events r WHERE r.user_id = p.id AND r.event_type = 'badge_earned'),
    'badge_titles', COALESCE((SELECT jsonb_agg(r.badge_title ORDER BY r.created_at DESC) FROM (
      SELECT badge_title, created_at FROM public.reward_events WHERE user_id = p.id AND event_type = 'badge_earned' ORDER BY created_at DESC LIMIT 8
    ) r), '[]'::jsonb),
    'season_points', (SELECT s.points FROM public.leaderboard_snapshot s JOIN public.leaderboard_seasons ls ON ls.id = s.season_id AND ls.is_active WHERE s.user_id = p.id LIMIT 1),
    'streak', CASE WHEN self OR is_friend OR teammate THEN public.training_streak(p.id) END
  );
END;
$$;

-- =============================================================================
-- 5. FAST LEADERBOARD
-- =============================================================================
-- Standings are stored and refreshed at most every 10 minutes instead of being
-- recalculated across every player's history on each visit. Days count on each
-- player's own calendar (their time zone), so nobody loses a day to UTC.
CREATE TABLE IF NOT EXISTS public.leaderboard_snapshot (
  season_id uuid NOT NULL REFERENCES public.leaderboard_seasons(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points integer NOT NULL DEFAULT 0,
  sessions_completed integer NOT NULL DEFAULT 0,
  training_days integer NOT NULL DEFAULT 0,
  quizzes_passed integer NOT NULL DEFAULT 0,
  challenge_points integer NOT NULL DEFAULT 0,
  current_streak integer NOT NULL DEFAULT 0,
  computed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (season_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_leaderboard_snapshot_points ON public.leaderboard_snapshot (season_id, points DESC);

CREATE TABLE IF NOT EXISTS public.leaderboard_refresh (
  id integer PRIMARY KEY CHECK (id = 1),
  refreshed_at timestamptz NOT NULL
);

ALTER TABLE public.leaderboard_snapshot ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard_refresh ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.leaderboard_snapshot, public.leaderboard_refresh FROM anon, authenticated;
GRANT ALL ON public.leaderboard_snapshot, public.leaderboard_refresh TO service_role;

CREATE OR REPLACE FUNCTION public.refresh_leaderboard(p_force boolean DEFAULT false)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT p_force AND EXISTS (SELECT 1 FROM public.leaderboard_refresh WHERE id = 1 AND refreshed_at > now() - interval '10 minutes') THEN
    RETURN;
  END IF;
  -- Only one refresh at a time; others just read the current standings
  IF NOT pg_try_advisory_xact_lock(hashtext('hoopiq_leaderboard_refresh')) THEN
    RETURN;
  END IF;

  DELETE FROM public.leaderboard_snapshot WHERE season_id IN (SELECT id FROM public.leaderboard_seasons WHERE is_active);

  INSERT INTO public.leaderboard_snapshot
    (season_id, user_id, points, sessions_completed, training_days, quizzes_passed, challenge_points, current_streak, computed_at)
  WITH seasons AS (
    SELECT id, starts_at, ends_at FROM public.leaderboard_seasons WHERE is_active
  ),
  zones AS (
    SELECT p.id AS user_id, COALESCE(tz.name, 'Europe/Dublin') AS tz
    FROM public.profiles p LEFT JOIN pg_timezone_names tz ON tz.name = p.timezone
  ),
  local AS (
    SELECT user_id, (now() AT TIME ZONE tz)::date AS today FROM zones
  ),
  activity AS (
    SELECT t.user_id, t.session_date AS day FROM public.training_sessions t
    UNION
    SELECT w.user_id, w.workout_date FROM public.workouts w
  ),
  players AS (
    SELECT DISTINCT s.id AS season_id, x.user_id
    FROM seasons s
    JOIN (
      SELECT user_id, day::timestamptz AS at FROM activity
      UNION ALL SELECT user_id, created_at FROM public.quiz_completions WHERE percentage >= 80
      UNION ALL SELECT user_id, completed_at FROM public.challenge_completions WHERE verified
    ) x ON x.at >= s.starts_at - interval '1 day' AND x.at < s.ends_at + interval '1 day'
  ),
  stats AS (
    SELECT
      pl.season_id,
      pl.user_id,
      (SELECT count(*) FROM public.training_sessions t
        WHERE t.user_id = pl.user_id AND t.session_date BETWEEN s.starts_at::date AND LEAST(s.ends_at::date, l.today))::int AS sessions_completed,
      (SELECT count(*) FROM activity a
        WHERE a.user_id = pl.user_id AND a.day BETWEEN s.starts_at::date AND LEAST(s.ends_at::date, l.today))::int AS training_days,
      (SELECT count(DISTINCT q.topic_id) FROM public.quiz_completions q
        WHERE q.user_id = pl.user_id AND q.percentage >= 80 AND q.created_at >= s.starts_at AND q.created_at < s.ends_at)::int AS quizzes_passed,
      (SELECT COALESCE(sum(c.points_earned), 0) FROM public.challenge_completions c
        WHERE c.user_id = pl.user_id AND c.verified AND c.season_id = s.id)::int AS challenge_points,
      l.today
    FROM players pl
    JOIN seasons s ON s.id = pl.season_id
    JOIN local l ON l.user_id = pl.user_id
  ),
  streak_days AS (
    SELECT a.user_id, a.day, a.day - (row_number() OVER (PARTITION BY a.user_id ORDER BY a.day))::int AS grp
    FROM activity a JOIN local l ON l.user_id = a.user_id
    WHERE a.day <= l.today AND a.day >= l.today - 400
  ),
  streaks AS (
    SELECT sd.user_id, count(*)::int AS current_streak
    FROM streak_days sd JOIN local l ON l.user_id = sd.user_id
    GROUP BY sd.user_id, sd.grp, l.today
    HAVING max(sd.day) >= l.today - 1
  )
  SELECT st.season_id, st.user_id,
    st.training_days * 10 + st.quizzes_passed * 10 + st.challenge_points,
    st.sessions_completed, st.training_days, st.quizzes_passed, st.challenge_points,
    COALESCE(sk.current_streak, 0),
    now()
  FROM stats st
  LEFT JOIN streaks sk ON sk.user_id = st.user_id;

  INSERT INTO public.leaderboard_refresh (id, refreshed_at) VALUES (1, now())
  ON CONFLICT (id) DO UPDATE SET refreshed_at = EXCLUDED.refreshed_at;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.refresh_leaderboard(boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_leaderboard(boolean) TO service_role;

-- One leaderboard for every view. p_scope: everyone | country | region | friends | team
-- p_age: all | u14 | 14-17 | 18+. Returns the top p_limit plus the caller's own row.
-- Everyone/country/region only include players who turned "Show me on the leaderboard" on
-- (plus yourself); friends and team views include your friends / teammates.
CREATE OR REPLACE FUNCTION public.leaderboard_page(
  p_scope text DEFAULT 'everyone',
  p_age text DEFAULT 'all',
  p_team uuid DEFAULT NULL,
  p_limit integer DEFAULT 100
)
RETURNS TABLE (
  user_id uuid,
  player_name text,
  points integer,
  rank integer,
  sessions_completed integer,
  training_days integer,
  quizzes_passed integer,
  challenge_points integer,
  current_streak integer,
  is_me boolean,
  total integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  me uuid := auth.uid();
  season uuid;
  my_country text;
  my_region text;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Not logged in'; END IF;
  PERFORM public.refresh_leaderboard(false);
  SELECT id INTO season FROM public.leaderboard_seasons WHERE is_active ORDER BY starts_at DESC LIMIT 1;
  IF season IS NULL THEN RETURN; END IF;
  SELECT country, region INTO my_country, my_region FROM public.profiles WHERE id = me;

  RETURN QUERY
  WITH pool AS (
    SELECT s.user_id, p.display_name, s.points, s.sessions_completed, s.training_days, s.quizzes_passed,
      s.challenge_points, s.current_streak
    FROM public.leaderboard_snapshot s
    JOIN public.profiles p ON p.id = s.user_id
    WHERE s.season_id = season
      AND (
        CASE p_scope
          WHEN 'everyone' THEN p.is_public OR p.id = me
          WHEN 'country' THEN (p.is_public OR p.id = me) AND my_country IS NOT NULL AND p.country = my_country
          WHEN 'region' THEN (p.is_public OR p.id = me) AND my_region IS NOT NULL
            AND p.country IS NOT DISTINCT FROM my_country AND lower(p.region) = lower(my_region)
          WHEN 'friends' THEN p.id = me OR EXISTS (
            SELECT 1 FROM public.friendships f
            WHERE f.status = 'accepted'
              AND LEAST(f.requester_id, f.addressee_id) = LEAST(me, p.id)
              AND GREATEST(f.requester_id, f.addressee_id) = GREATEST(me, p.id))
          WHEN 'team' THEN p_team IS NOT NULL AND public.is_team_member(p_team, me) AND public.is_team_member(p_team, p.id)
          ELSE false
        END
      )
      AND (COALESCE(p_age, 'all') = 'all' OR public.age_group(p.age_bracket) = p_age)
  ),
  ranked AS (
    SELECT pool.*, (RANK() OVER (ORDER BY pool.points DESC))::int AS rnk, (count(*) OVER ())::int AS cnt FROM pool
  )
  SELECT r.user_id, r.display_name, r.points, r.rnk, r.sessions_completed, r.training_days, r.quizzes_passed,
    r.challenge_points, r.current_streak, r.user_id = me, r.cnt
  FROM ranked r
  WHERE r.rnk <= GREATEST(COALESCE(p_limit, 100), 0) OR r.user_id = me
  ORDER BY r.rnk, r.display_name;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.player_card(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.leaderboard_page(text, text, uuid, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.age_group(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.player_card(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.leaderboard_page(text, text, uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.age_group(text) TO authenticated, service_role;
