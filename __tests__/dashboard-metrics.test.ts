// __tests__/dashboard-metrics.test.ts
import { describe, it, expect } from 'vitest';
import { computeDashboardMetrics, rankZones } from '@/lib/dashboard';
import { fetchAllRows, PAGE_SIZE, totalsByZone } from '@/lib/player-activity';

const base = { zones: [], personalRecords: 0, weeklyGoalTarget: null, today: '2026-09-24', weekStart: '2026-09-21' };

describe('dashboard metrics', () => {
  it('consistency is the share of the last 30 days with training (not always 100%)', () => {
    const m = computeDashboardMetrics({ ...base, sessionDates: ['2026-09-24', '2026-09-24', '2026-09-20'], workoutDates: ['2026-09-22', '2026-08-01'] });
    // 3 distinct days in the last 30 (Aug 1 is outside the window)
    expect(m.consistency).toBe(10);
    expect(computeDashboardMetrics({ ...base, sessionDates: [], workoutDates: [] }).consistency).toBe(0);
  });

  it('streak and weekly goal include gym workouts, like the leaderboard and Goals page', () => {
    const m = computeDashboardMetrics({
      ...base,
      sessionDates: ['2026-09-24', '2026-09-22'],
      workoutDates: ['2026-09-23', '2026-09-21'],
    });
    expect(m.currentStreak).toBe(4);
    expect(m.weeklyGoalProgress).toBe(4);
    expect(m.thisWeekSessions).toBe(2);
    expect(m.totalSessions).toBe(2);
    expect(m.weeklyGoalTarget).toBe(4); // default when no goal is set
  });

  it('streak counts from yesterday when today is not logged yet', () => {
    const m = computeDashboardMetrics({ ...base, sessionDates: ['2026-09-23', '2026-09-22'], workoutDates: [] });
    expect(m.currentStreak).toBe(2);
  });

  it('career shooting % comes from the zone totals', () => {
    const zones = totalsByZone([
      { shot_zone: 'paint', makes: 6, attempts: 10 },
      { shot_zone: 'three-top', makes: 1, attempts: 10 },
      { shot_zone: 'paint', makes: 4, attempts: 10 },
    ]);
    const m = computeDashboardMetrics({ ...base, zones, sessionDates: [], workoutDates: [] });
    expect(m.shootingPercentage).toBe(36.7);
    expect(rankZones(zones).map((z) => [z.zone, z.percentage])).toEqual([
      ['paint', 50],
      ['three-top', 10],
    ]);
  });
});

describe('fetchAllRows', () => {
  it('keeps reading past the 1,000-row limit of a single request', async () => {
    const total = PAGE_SIZE * 2 + 5;
    const pages: Array<[number, number]> = [];
    const rows = await fetchAllRows(async (from, to) => {
      pages.push([from, to]);
      const data = Array.from({ length: Math.max(0, Math.min(to, total - 1) - from + 1) }, (_, i) => from + i);
      return { data, error: null };
    });
    expect(rows.length).toBe(total);
    expect(pages.length).toBe(3);
  });

  it('stops on an error', async () => {
    const rows = await fetchAllRows(async () => ({ data: null, error: { message: 'x' } }));
    expect(rows).toEqual([]);
  });
});
