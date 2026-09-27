// src/lib/coach.ts
// Team summaries for the Coach dashboard, built from team_roster rows.

export interface RosterStats {
  user_id: string;
  display_name: string;
  role: 'coach' | 'player';
  share_details: boolean;
  sessions_7d: number;
  workouts_7d: number;
  minutes_7d: number;
  makes_7d: number;
  attempts_7d: number;
  last_active: string | null;
  games: number;
  ppg: number | null;
}

export interface TeamSummary {
  players: number;
  activeThisWeek: number;
  minutes: number;
  makes: number;
  attempts: number;
  shootingPct: number | null;
  avgPpg: number | null;
  sharing: number;
  /** Players with no training logged for 7+ days (or never) */
  quiet: Array<{ user_id: string; display_name: string; last_active: string | null }>;
  /** Most active players this week (by sessions, then minutes) */
  top: Array<{ user_id: string; display_name: string; sessions: number; minutes: number }>;
}

const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

export function summarizeTeam(roster: RosterStats[], today: string): TeamSummary {
  const players = roster.filter((r) => r.role === 'player');
  const active = players.filter((p) => p.sessions_7d + p.workouts_7d > 0);
  const makes = players.reduce((n, p) => n + (p.makes_7d || 0), 0);
  const attempts = players.reduce((n, p) => n + (p.attempts_7d || 0), 0);
  const withGames = players.filter((p) => p.games > 0 && p.ppg != null);
  return {
    players: players.length,
    activeThisWeek: active.length,
    minutes: players.reduce((n, p) => n + (p.minutes_7d || 0), 0),
    makes,
    attempts,
    shootingPct: attempts > 0 ? Math.round((makes / attempts) * 1000) / 10 : null,
    avgPpg: withGames.length ? Math.round((withGames.reduce((n, p) => n + Number(p.ppg), 0) / withGames.length) * 10) / 10 : null,
    sharing: players.filter((p) => p.share_details).length,
    quiet: players
      .filter((p) => !p.last_active || daysBetween(p.last_active, today) >= 7)
      .sort((a, b) => (a.last_active || '').localeCompare(b.last_active || ''))
      .map((p) => ({ user_id: p.user_id, display_name: p.display_name, last_active: p.last_active })),
    top: [...active]
      .sort((a, b) => b.sessions_7d + b.workouts_7d - (a.sessions_7d + a.workouts_7d) || b.minutes_7d - a.minutes_7d)
      .slice(0, 3)
      .map((p) => ({ user_id: p.user_id, display_name: p.display_name, sessions: p.sessions_7d + p.workouts_7d, minutes: p.minutes_7d })),
  };
}
