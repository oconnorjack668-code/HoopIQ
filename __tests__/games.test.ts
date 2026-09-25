// __tests__/games.test.ts
import { describe, it, expect } from 'vitest';
import { EMPTY_BOX, clampBox, points, seasonAverages, statLine } from '@/lib/games';

const g1 = { ...EMPTY_BOX, fgm2: 5, fga2: 9, fgm3: 2, fga3: 6, ftm: 4, fta: 5, oreb: 1, dreb: 6, ast: 3, result: 'win', minutes: 28 };
const g2 = { ...EMPTY_BOX, fgm2: 3, fga2: 8, fgm3: 1, fga3: 4, ftm: 2, fta: 2, dreb: 3, ast: 5, stl: 2, result: 'loss', minutes: null };

describe('game stats', () => {
  it('counts points like the database', () => {
    expect(points(g1)).toBe(20);
    expect(statLine(g1)).toBe('20 pts · 7 reb · 3 ast');
  });

  it('keeps a box score valid', () => {
    const c = clampBox({ ...EMPTY_BOX, fgm3: 4, fga3: 2, ftm: -1, pf: 12 });
    expect(c).toMatchObject({ fgm3: 4, fga3: 4, ftm: 0, pf: 10 });
  });

  it('works out season averages and efficiency', () => {
    const s = seasonAverages([g1, g2]);
    expect(s).toMatchObject({ games: 2, wins: 1, losses: 1, ppg: 15.5, rpg: 5, apg: 4, spg: 1, mpg: 28, best: 20 });
    expect(s.fgPct).toBe(40.7); // 11/27
    expect(s.threePct).toBe(30); // 3/10
    expect(s.ftPct).toBe(85.7); // 6/7
    expect(s.efgPct).toBe(46.3); // (11 + 1.5) / 27
    expect(s.tsPct).toBe(51.5); // 31 / (2 × (27 + 0.44 × 7))
  });

  it('handles no games', () => {
    expect(seasonAverages([])).toMatchObject({ games: 0, ppg: 0, fgPct: null, best: 0 });
  });
});
