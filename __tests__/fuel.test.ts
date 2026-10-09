import { describe, it, expect } from 'vitest';
import {
  summarise,
  eatingBeforeInsight,
  isValidEnergy,
  isValidSleep,
  isHydration,
  MIN_DAYS_FOR_INSIGHT,
  type FuelEntry,
} from '@/lib/fuel';

const entry = (i: number, over: Partial<FuelEntry> = {}): FuelEntry => ({
  log_date: `2026-10-${String(i).padStart(2, '0')}`,
  ate_before: null,
  ate_after: null,
  hydration: null,
  sleep_hours: null,
  energy: null,
  ...over,
});

const days = (n: number, over: Partial<FuelEntry>, from = 1) =>
  Array.from({ length: n }, (_, i) => entry(from + i, over));

describe('validation', () => {
  it('accepts energy only as a whole 1 to 5', () => {
    expect(isValidEnergy(1)).toBe(true);
    expect(isValidEnergy(5)).toBe(true);
    expect(isValidEnergy(0)).toBe(false);
    expect(isValidEnergy(6)).toBe(false);
    expect(isValidEnergy(3.5)).toBe(false);
    expect(isValidEnergy(null)).toBe(false);
  });

  it('accepts a believable number of hours of sleep', () => {
    expect(isValidSleep(0)).toBe(true);
    expect(isValidSleep(7.5)).toBe(true);
    expect(isValidSleep(16)).toBe(true);
    expect(isValidSleep(-1)).toBe(false);
    expect(isValidSleep(30)).toBe(false);
    expect(isValidSleep(Number.NaN)).toBe(false);
  });

  it('accepts only the three hydration levels', () => {
    expect(isHydration('low')).toBe(true);
    expect(isHydration('good')).toBe(true);
    expect(isHydration('excellent')).toBe(false);
    expect(isHydration(null)).toBe(false);
  });
});

describe('summarise', () => {
  it('describes an empty history without inventing numbers', () => {
    const s = summarise([]);
    expect(s.daysLogged).toBe(0);
    expect(s.ateBeforeRate).toBeNull();
    expect(s.averageSleep).toBeNull();
    expect(s.averageEnergy).toBeNull();
  });

  it('counts distinct days', () => {
    expect(summarise([entry(1), entry(1), entry(2)]).daysLogged).toBe(2);
  });

  it('reports the share of days eaten beforehand', () => {
    const s = summarise([
      entry(1, { ate_before: true }),
      entry(2, { ate_before: true }),
      entry(3, { ate_before: false }),
      entry(4, { ate_before: false }),
    ]);
    expect(s.ateBeforeRate).toBe(50);
  });

  it('ignores unanswered fields rather than counting them as zero', () => {
    const s = summarise([entry(1, { sleep_hours: 8, energy: 4 }), entry(2)]);
    expect(s.averageSleep).toBe(8);
    expect(s.averageEnergy).toBe(4);
  });

  it('rejects out-of-range values that reached the database somehow', () => {
    const s = summarise([entry(1, { sleep_hours: 99, energy: 50 })]);
    expect(s.averageSleep).toBeNull();
    expect(s.averageEnergy).toBeNull();
  });
});

describe('eatingBeforeInsight', () => {
  it('says nothing at all until there are enough days on both sides', () => {
    const lopsided = [
      ...days(MIN_DAYS_FOR_INSIGHT + 3, { ate_before: true, energy: 5 }),
      ...days(2, { ate_before: false, energy: 2 }, 20),
    ];
    const r = eatingBeforeInsight(lopsided);
    expect(r.enoughData).toBe(false);
    expect(r.message).toMatch(/log a few more days/i);
  });

  it('says nothing for an empty history', () => {
    expect(eatingBeforeInsight([]).enoughData).toBe(false);
  });

  it('spots a real difference once there is enough of both', () => {
    const r = eatingBeforeInsight([
      ...days(MIN_DAYS_FOR_INSIGHT, { ate_before: true, energy: 4 }),
      ...days(MIN_DAYS_FOR_INSIGHT, { ate_before: false, energy: 2 }, 20),
    ]);
    expect(r.enoughData).toBe(true);
    expect(r.withFood).toBe(4);
    expect(r.withoutFood).toBe(2);
    expect(r.message).toMatch(/feel better when you have eaten/i);
  });

  it('does not claim a difference when there barely is one', () => {
    const r = eatingBeforeInsight([
      ...days(MIN_DAYS_FOR_INSIGHT, { ate_before: true, energy: 3 }),
      ...days(MIN_DAYS_FOR_INSIGHT, { ate_before: false, energy: 3 }, 20),
    ]);
    expect(r.enoughData).toBe(true);
    expect(r.message).toMatch(/about the same/i);
  });

  it('stays tentative when the result points the unexpected way', () => {
    const r = eatingBeforeInsight([
      ...days(MIN_DAYS_FOR_INSIGHT, { ate_before: true, energy: 2 }),
      ...days(MIN_DAYS_FOR_INSIGHT, { ate_before: false, energy: 4 }, 20),
    ]);
    expect(r.enoughData).toBe(true);
    expect(r.message).toMatch(/watching rather than acting/i);
  });

  it('ignores days where energy was never rated', () => {
    const r = eatingBeforeInsight([
      ...days(MIN_DAYS_FOR_INSIGHT, { ate_before: true, energy: 4 }),
      ...days(MIN_DAYS_FOR_INSIGHT, { ate_before: false, energy: 2 }, 20),
      ...days(30, { ate_before: true, energy: null }, 40),
    ]);
    expect(r.withFood).toBe(4);
  });
});
