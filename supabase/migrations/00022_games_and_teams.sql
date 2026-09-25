-- 00022_games_and_teams.sql
-- Round G: game stats (box scores) and coach/team mode. Safe to re-run.
-- Teams: a coach (Pro or owner) creates a team; players join with the team code.
-- Members see the roster's training totals and game averages (never notes or videos);
-- coaches post assignments that players tick off.

-- =============================================================================
-- 1. GAMES
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_date date NOT NULL DEFAULT CURRENT_DATE,
  game_type text NOT NULL DEFAULT 'league'
    CHECK (game_type IN ('league', 'school', 'club', 'tournament', 'friendly', 'pickup', '3x3')),
  opponent text CHECK (opponent IS NULL OR char_length(opponent) <= 80),
  result text CHECK (result IS NULL OR result IN ('win', 'loss', 'draw')),
  team_score smallint CHECK (team_score IS NULL OR team_score BETWEEN 0 AND 300),
  opponent_score smallint CHECK (opponent_score IS NULL OR opponent_score BETWEEN 0 AND 300),
  minutes smallint CHECK (minutes IS NULL OR minutes BETWEEN 0 AND 60),
  fgm2 smallint NOT NULL DEFAULT 0 CHECK (fgm2 >= 0),
  fga2 smallint NOT NULL DEFAULT 0 CHECK (fga2 >= 0),
  fgm3 smallint NOT NULL DEFAULT 0 CHECK (fgm3 >= 0),
  fga3 smallint NOT NULL DEFAULT 0 CHECK (fga3 >= 0),
  ftm smallint NOT NULL DEFAULT 0 CHECK (ftm >= 0),
  fta smallint NOT NULL DEFAULT 0 CHECK (fta >= 0),
  oreb smallint NOT NULL DEFAULT 0 CHECK (oreb >= 0),
  dreb smallint NOT NULL DEFAULT 0 CHECK (dreb >= 0),
  ast smallint NOT NULL DEFAULT 0 CHECK (ast >= 0),
  stl smallint NOT NULL DEFAULT 0 CHECK (stl >= 0),
  blk smallint NOT NULL DEFAULT 0 CHECK (blk >= 0),
  tov smallint NOT NULL DEFAULT 0 CHECK (tov >= 0),
  pf smallint NOT NULL DEFAULT 0 CHECK (pf BETWEEN 0 AND 10),
  points smallint GENERATED ALWAYS AS (2 * fgm2 + 3 * fgm3 + ftm) STORED,
  notes text CHECK (notes IS NULL OR char_length(notes) <= 1000),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (fgm2 <= fga2 AND fgm3 <= fga3 AND ftm <= fta)
);
CREATE INDEX IF NOT EXISTS idx_games_user_date ON public.games (user_id, game_date DESC);

ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own games" ON public.games;
CREATE POLICY "Users manage own games" ON public.games
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.games TO authenticated;
GRANT ALL ON public.games TO service_role;
REVOKE ALL ON public.games FROM anon;

-- =============================================================================
-- 2. TEAMS
-- =============================================================================
CREATE OR REPLACE FUNCTION public.new_team_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  code text;
BEGIN
  LOOP
    code := 'T';
    FOR i IN 1..5 LOOP
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.teams WHERE join_code = code);
  END LOOP;
  RETURN code;
END;
$$;

CREATE TABLE IF NOT EXISTS public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 60),
  join_code text NOT NULL UNIQUE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.teams ALTER COLUMN join_code SET DEFAULT public.new_team_code();

CREATE TABLE IF NOT EXISTS public.team_members (
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'player' CHECK (role IN ('coach', 'player')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON public.team_members (user_id);

CREATE TABLE IF NOT EXISTS public.team_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title text NOT NULL CHECK (char_length(title) BETWEEN 2 AND 120),
  details text CHECK (details IS NULL OR char_length(details) <= 2000),
  link text CHECK (link IS NULL OR (char_length(link) <= 300 AND link LIKE '/%')), -- in-app link only
  due_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_team_assignments_team ON public.team_assignments (team_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.team_assignment_completions (
  assignment_id uuid NOT NULL REFERENCES public.team_assignments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (assignment_id, user_id)
);

-- Membership checks used by the policies (definer, so policies don't recurse into team_members' own RLS)
CREATE OR REPLACE FUNCTION public.is_team_member(p_team uuid, p_user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.team_members WHERE team_id = p_team AND user_id = p_user);
$$;

CREATE OR REPLACE FUNCTION public.is_team_coach(p_team uuid, p_user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.team_members WHERE team_id = p_team AND user_id = p_user AND role = 'coach');
$$;

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_assignment_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members see their teams" ON public.teams;
CREATE POLICY "Members see their teams" ON public.teams
  FOR SELECT USING (public.is_team_member(id, auth.uid()));
DROP POLICY IF EXISTS "Coaches rename their teams" ON public.teams;
CREATE POLICY "Coaches rename their teams" ON public.teams
  FOR UPDATE USING (public.is_team_coach(id, auth.uid())) WITH CHECK (public.is_team_coach(id, auth.uid()));

DROP POLICY IF EXISTS "Members see their team's members" ON public.team_members;
CREATE POLICY "Members see their team's members" ON public.team_members
  FOR SELECT USING (public.is_team_member(team_id, auth.uid()));
DROP POLICY IF EXISTS "Leave a team, or coach removes a member" ON public.team_members;
CREATE POLICY "Leave a team, or coach removes a member" ON public.team_members
  FOR DELETE USING (user_id = auth.uid() OR public.is_team_coach(team_id, auth.uid()));

DROP POLICY IF EXISTS "Members see assignments" ON public.team_assignments;
CREATE POLICY "Members see assignments" ON public.team_assignments
  FOR SELECT USING (public.is_team_member(team_id, auth.uid()));
DROP POLICY IF EXISTS "Coaches add assignments" ON public.team_assignments;
CREATE POLICY "Coaches add assignments" ON public.team_assignments
  FOR INSERT WITH CHECK (public.is_team_coach(team_id, auth.uid()) AND created_by = auth.uid());
DROP POLICY IF EXISTS "Coaches edit assignments" ON public.team_assignments;
CREATE POLICY "Coaches edit assignments" ON public.team_assignments
  FOR UPDATE USING (public.is_team_coach(team_id, auth.uid())) WITH CHECK (public.is_team_coach(team_id, auth.uid()));
DROP POLICY IF EXISTS "Coaches delete assignments" ON public.team_assignments;
CREATE POLICY "Coaches delete assignments" ON public.team_assignments
  FOR DELETE USING (public.is_team_coach(team_id, auth.uid()));

DROP POLICY IF EXISTS "Members see completions" ON public.team_assignment_completions;
CREATE POLICY "Members see completions" ON public.team_assignment_completions
  FOR SELECT USING (
    public.is_team_member((SELECT a.team_id FROM public.team_assignments a WHERE a.id = assignment_id), auth.uid())
  );
DROP POLICY IF EXISTS "Players tick off their own assignments" ON public.team_assignment_completions;
CREATE POLICY "Players tick off their own assignments" ON public.team_assignment_completions
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND public.is_team_member((SELECT a.team_id FROM public.team_assignments a WHERE a.id = assignment_id), auth.uid())
  );
DROP POLICY IF EXISTS "Players untick their own assignments" ON public.team_assignment_completions;
CREATE POLICY "Players untick their own assignments" ON public.team_assignment_completions
  FOR DELETE USING (user_id = auth.uid());

GRANT SELECT ON public.teams TO authenticated;
GRANT UPDATE (name) ON public.teams TO authenticated;
GRANT SELECT, DELETE ON public.team_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_assignments TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.team_assignment_completions TO authenticated;
GRANT ALL ON public.teams, public.team_members, public.team_assignments, public.team_assignment_completions TO service_role;
REVOKE ALL ON public.teams, public.team_members, public.team_assignments, public.team_assignment_completions FROM anon;

-- Create a team (coaches need Pro, or the owner role). Returns the team id.
CREATE OR REPLACE FUNCTION public.create_team(p_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  new_id uuid;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Not logged in'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.subscriptions WHERE user_id = me AND plan_type IN ('pro', 'owner'))
     AND NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = me AND role = 'owner') THEN
    RAISE EXCEPTION 'Creating a team needs HoopIQ Pro';
  END IF;
  IF (SELECT count(*) FROM public.teams WHERE created_by = me) >= 10 THEN
    RAISE EXCEPTION 'You can create up to 10 teams';
  END IF;
  INSERT INTO public.teams (name, created_by) VALUES (trim(p_name), me) RETURNING id INTO new_id;
  INSERT INTO public.team_members (team_id, user_id, role) VALUES (new_id, me, 'coach');
  RETURN new_id;
END;
$$;

-- Join with a team code. Returns 'joined', 'already', 'not_found' or 'full'.
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
  INSERT INTO public.team_members (team_id, user_id, role) VALUES (target, me, 'player');
  RETURN 'joined';
END;
$$;

-- Coach makes a member a coach or a player (a team always keeps at least one coach)
CREATE OR REPLACE FUNCTION public.set_team_role(p_team uuid, p_user uuid, p_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_team_coach(p_team, auth.uid()) THEN RAISE EXCEPTION 'Only coaches can change roles'; END IF;
  IF p_role NOT IN ('coach', 'player') THEN RAISE EXCEPTION 'Unknown role'; END IF;
  IF p_role = 'player' AND (SELECT count(*) FROM public.team_members WHERE team_id = p_team AND role = 'coach') <= 1
     AND public.is_team_coach(p_team, p_user) THEN
    RAISE EXCEPTION 'A team needs at least one coach';
  END IF;
  UPDATE public.team_members SET role = p_role WHERE team_id = p_team AND user_id = p_user;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_team(p_team uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_team_coach(p_team, auth.uid()) THEN RAISE EXCEPTION 'Only coaches can delete a team'; END IF;
  DELETE FROM public.teams WHERE id = p_team;
END;
$$;

-- Roster with training totals (last 7 and 28 days) and game averages. Members only.
CREATE OR REPLACE FUNCTION public.team_roster(p_team uuid)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  player_position text,
  role text,
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
    p.position,
    m.role,
    (SELECT count(*)::int FROM public.training_sessions t WHERE t.user_id = m.user_id AND t.session_date >= current_date - 6),
    (SELECT count(*)::int FROM public.workouts w WHERE w.user_id = m.user_id AND w.workout_date >= current_date - 6),
    (SELECT COALESCE(sum(t.duration_minutes), 0)::int FROM public.training_sessions t WHERE t.user_id = m.user_id AND t.session_date >= current_date - 6)
      + (SELECT COALESCE(sum(w.duration_minutes), 0)::int FROM public.workouts w WHERE w.user_id = m.user_id AND w.workout_date >= current_date - 6),
    (SELECT COALESCE(sum(e.makes), 0)::int FROM public.shooting_entries e
      JOIN public.session_drills d ON d.id = e.drill_id JOIN public.training_sessions t ON t.id = d.session_id
      WHERE e.user_id = m.user_id AND t.session_date >= current_date - 6),
    (SELECT COALESCE(sum(e.attempts), 0)::int FROM public.shooting_entries e
      JOIN public.session_drills d ON d.id = e.drill_id JOIN public.training_sessions t ON t.id = d.session_id
      WHERE e.user_id = m.user_id AND t.session_date >= current_date - 6),
    (SELECT count(*)::int FROM public.training_sessions t WHERE t.user_id = m.user_id AND t.session_date >= current_date - 27)
      + (SELECT count(*)::int FROM public.workouts w WHERE w.user_id = m.user_id AND w.workout_date >= current_date - 27),
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
    WHERE gm.user_id = m.user_id AND gm.game_date >= current_date - 365
  ) g ON true
  WHERE m.team_id = p_team AND public.is_team_member(p_team, auth.uid());
$$;

REVOKE EXECUTE ON FUNCTION public.new_team_code() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_team_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_team_coach(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.create_team(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.join_team(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_team_role(uuid, uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.delete_team(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.team_roster(uuid) FROM PUBLIC, anon;
-- Policies call the membership checks as the signed-in player
GRANT EXECUTE ON FUNCTION public.is_team_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_team_coach(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_team(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_team(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_team_role(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_team(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.team_roster(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.new_team_code() TO service_role;

-- =============================================================================
-- 3. FRIEND FEED: include games
-- =============================================================================
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
    SELECT g.user_id, p.display_name, 'game'::text, g.game_date, g.created_at,
      'Played a game' || CASE WHEN g.result = 'win' THEN ' (W)' WHEN g.result = 'loss' THEN ' (L)' ELSE '' END,
      g.points || ' pts · ' || (g.oreb + g.dreb) || ' reb · ' || g.ast || ' ast'
    FROM public.games g
    JOIN friends f ON f.id = g.user_id
    JOIN public.profiles p ON p.id = g.user_id
    WHERE g.game_date >= current_date - 13
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
REVOKE EXECUTE ON FUNCTION public.friend_feed(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.friend_feed(integer) TO authenticated;
