// __tests__/exercises.test.ts
import { describe, it, expect } from 'vitest';
import { isPersonalRecord, setScore, categoryForMuscle, muscleLabel } from '@/lib/exercises';

describe('PR detection', () => {
  const history = [
    { weight_kg: 100, reps: 5 },
    { weight_kg: 90, reps: 8 },
  ];

  it('scores weighted sets by estimated 1RM and bodyweight sets by reps', () => {
    expect(setScore(100, 5)).toBeCloseTo(116.67, 1);
    expect(setScore(null, 12)).toBe(12);
    expect(setScore(100, 0)).toBe(0);
  });

  it('flags a set that beats every earlier set', () => {
    expect(isPersonalRecord(105, 5, history)).toBe(true);
    expect(isPersonalRecord(100, 6, history)).toBe(true);
  });

  it('does not flag ties, lighter sets, or the first time an exercise is logged', () => {
    expect(isPersonalRecord(100, 5, history)).toBe(false);
    expect(isPersonalRecord(80, 5, history)).toBe(false);
    expect(isPersonalRecord(60, 5, [])).toBe(false);
  });

  it('compares bodyweight sets only with bodyweight sets', () => {
    const mixed = [...history, { weight_kg: null, reps: 15 }];
    expect(isPersonalRecord(null, 16, mixed)).toBe(true);
    expect(isPersonalRecord(null, 15, mixed)).toBe(false);
  });
});

describe('muscle groups', () => {
  it('maps muscle groups to library categories and labels', () => {
    expect(categoryForMuscle('chest')).toBe('upper_body_push');
    expect(categoryForMuscle('hamstrings')).toBe('legs');
    expect(categoryForMuscle('injury_prevention')).toBe('recovery');
    expect(muscleLabel('forearms')).toBe('Forearms & Grip');
    expect(muscleLabel(null)).toBe('Other');
  });
});
