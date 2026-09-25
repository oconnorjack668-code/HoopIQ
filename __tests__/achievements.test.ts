// __tests__/achievements.test.ts
import { describe, it, expect } from 'vitest';
import { BADGES, challengeProgress, rankFor, streaks, xpFor, type PlayerStats } from '@/lib/achievements';

const base: PlayerStats = {
  totalSessions: 0,
  totalWorkouts: 0,
  totalMakes: 0,
  totalLessons: 0,
  sectionsWithLesson: 0,
  totalPRs: 0,
  programsCompleted: 0,
  videoTracked: 0,
  longestStreak: 0,
  currentStreak: 0,
  week: { trainingDays: 0, makes: 0, lessons: 0, workouts: 0, sessions: 0, programSessions: 0 },
};

describe('achievements', () => {
  it('tracks weekly challenge progress and caps the bar at the target', () => {
    const s = { ...base, week: { ...base.week, trainingDays: 5, makes: 120 } };
    expect(challengeProgress({ metric: 'training_days', target: 4 }, s)).toEqual({ current: 4, target: 4, done: true });
    expect(challengeProgress({ metric: 'makes', target: 200 }, s)).toEqual({ current: 120, target: 200, done: false });
  });

  it('needs a session, a workout and a lesson for a balanced week', () => {
    const two = { ...base, week: { ...base.week, sessions: 2, workouts: 1 } };
    expect(challengeProgress({ metric: 'balanced', target: 3 }, two).done).toBe(false);
    const all = { ...two, week: { ...two.week, lessons: 1 } };
    expect(challengeProgress({ metric: 'balanced', target: 3 }, all).done).toBe(true);
  });

  it('earns badges at their thresholds', () => {
    const s = { ...base, totalSessions: 10, totalMakes: 10000, longestStreak: 7 };
    const earned = BADGES.filter((b) => b.earned(s)).map((b) => b.id);
    expect(earned).toEqual(expect.arrayContaining(['first-session', 'sessions-10', 'makes-1000', 'makes-10000', 'streak-7']));
    expect(earned).not.toContain('sessions-50');
    expect(new Set(BADGES.map((b) => b.id)).size).toBe(BADGES.length);
  });

  it('adds XP and finds the rank with progress to the next one', () => {
    const xp = xpFor({ ...base, totalSessions: 20, totalMakes: 1500 }, 100, 2);
    expect(xp).toBe(20 * 20 + 150 + 100 + 100);
    expect(rankFor(0)).toMatchObject({ name: 'Rookie', next: { name: 'Prospect' } });
    const r = rankFor(750);
    expect(r.name).toBe('Prospect');
    expect(r.progress).toBeCloseTo(0.9, 5);
    expect(rankFor(20000)).toMatchObject({ name: 'GOAT', next: null, progress: 1 });
  });

  it('computes longest and current streaks', () => {
    const days = ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-10', '2026-09-23', '2026-09-24'];
    expect(streaks(days, '2026-09-25')).toEqual({ longest: 3, current: 2 });
    expect(streaks(days, '2026-09-24')).toEqual({ longest: 3, current: 2 });
    expect(streaks(days, '2026-09-27').current).toBe(0);
  });
});
