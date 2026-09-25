// src/lib/games.ts
// Game stats: box-score fields, season averages and shooting efficiency.

export const GAME_TYPES = [
  { value: 'league', label: 'League' },
  { value: 'school', label: 'School' },
  { value: 'club', label: 'Club' },
  { value: 'tournament', label: 'Tournament' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'pickup', label: 'Pickup' },
  { value: '3x3', label: '3x3' },
] as const;

export const COUNTING_STATS = ['fgm2', 'fga2', 'fgm3', 'fga3', 'ftm', 'fta', 'oreb', 'dreb', 'ast', 'stl', 'blk', 'tov', 'pf'] as const;
export type CountingStat = (typeof COUNTING_STATS)[number];
export type BoxScore = Record<CountingStat, number>;

export const EMPTY_BOX: BoxScore = { fgm2: 0, fga2: 0, fgm3: 0, fga3: 0, ftm: 0, fta: 0, oreb: 0, dreb: 0, ast: 0, stl: 0, blk: 0, tov: 0, pf: 0 };

export interface GameRow extends BoxScore {
  id: string;
  game_date: string;
  game_type: string;
  opponent: string | null;
  result: 'win' | 'loss' | 'draw' | null;
  team_score: number | null;
  opponent_score: number | null;
  minutes: number | null;
  points: number;
  notes: string | null;
}

export function points(b: BoxScore): number {
  return 2 * b.fgm2 + 3 * b.fgm3 + b.ftm;
}

/** Keeps a box score valid: no negatives, makes never above attempts, foul limit. */
export function clampBox(b: BoxScore): BoxScore {
  const c = { ...b };
  for (const k of COUNTING_STATS) c[k] = Math.max(0, Math.min(k === 'pf' ? 10 : 200, Math.round(c[k] || 0)));
  c.fga2 = Math.max(c.fga2, c.fgm2);
  c.fga3 = Math.max(c.fga3, c.fgm3);
  c.fta = Math.max(c.fta, c.ftm);
  return c;
}

const ratio = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : null);

export interface SeasonAverages {
  games: number;
  wins: number;
  losses: number;
  ppg: number;
  rpg: number;
  apg: number;
  spg: number;
  bpg: number;
  topg: number;
  mpg: number | null;
  fgPct: number | null;
  threePct: number | null;
  ftPct: number | null;
  /** Effective FG%: a three counts 1.5 makes */
  efgPct: number | null;
  /** True shooting %: points per shooting possession, including free throws */
  tsPct: number | null;
  best: number;
}

export function seasonAverages(games: Array<BoxScore & { result?: string | null; minutes?: number | null }>): SeasonAverages {
  const n = games.length;
  const sum = (f: (g: (typeof games)[number]) => number) => games.reduce((s, g) => s + f(g), 0);
  const avg = (f: (g: (typeof games)[number]) => number) => (n ? Math.round((sum(f) / n) * 10) / 10 : 0);
  const fgm = sum((g) => g.fgm2 + g.fgm3);
  const fga = sum((g) => g.fga2 + g.fga3);
  const pts = sum(points);
  const withMinutes = games.filter((g) => g.minutes != null);
  return {
    games: n,
    wins: games.filter((g) => g.result === 'win').length,
    losses: games.filter((g) => g.result === 'loss').length,
    ppg: avg(points),
    rpg: avg((g) => g.oreb + g.dreb),
    apg: avg((g) => g.ast),
    spg: avg((g) => g.stl),
    bpg: avg((g) => g.blk),
    topg: avg((g) => g.tov),
    mpg: withMinutes.length ? Math.round((withMinutes.reduce((s, g) => s + (g.minutes || 0), 0) / withMinutes.length) * 10) / 10 : null,
    fgPct: ratio(fgm, fga),
    threePct: ratio(sum((g) => g.fgm3), sum((g) => g.fga3)),
    ftPct: ratio(sum((g) => g.ftm), sum((g) => g.fta)),
    efgPct: ratio(fgm + 0.5 * sum((g) => g.fgm3), fga),
    tsPct: ratio(pts, 2 * (fga + 0.44 * sum((g) => g.fta))),
    best: n ? Math.max(...games.map(points)) : 0,
  };
}

export function statLine(g: BoxScore): string {
  return `${points(g)} pts · ${g.oreb + g.dreb} reb · ${g.ast} ast`;
}
