import { describe, it, expect } from 'vitest';
import { pickDailyQuestion, seededShuffle, dayNumber, daysUntilRepeat, type QuestionRef } from '@/lib/dailyIq';

const pool = (n: number): QuestionRef[] =>
  Array.from({ length: n }, (_, i) => ({ itemId: `item-${Math.floor(i / 7)}`, index: i % 7 }));

describe('seededShuffle', () => {
  it('is deterministic for a given seed', () => {
    expect(seededShuffle([1, 2, 3, 4, 5], 'user-a')).toEqual(seededShuffle([1, 2, 3, 4, 5], 'user-a'));
  });

  it('gives different players different orders', () => {
    const a = seededShuffle(pool(40), 'user-a');
    const b = seededShuffle(pool(40), 'user-b');
    expect(a).not.toEqual(b);
  });

  it('keeps every item exactly once', () => {
    const items = pool(50);
    const shuffled = seededShuffle(items, 'user-a');
    expect(shuffled).toHaveLength(50);
    expect(new Set(shuffled.map((q) => `${q.itemId}:${q.index}`)).size).toBe(50);
  });

  it('does not mutate the input', () => {
    const items = [1, 2, 3, 4, 5];
    seededShuffle(items, 'seed');
    expect(items).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('pickDailyQuestion', () => {
  it('gives the same question all day however often it is asked', () => {
    const p = pool(100);
    const a = pickDailyQuestion(p, 'user-a', '2026-10-09');
    const b = pickDailyQuestion(p, 'user-a', '2026-10-09');
    expect(a).toEqual(b);
  });

  it('gives a different question tomorrow', () => {
    const p = pool(100);
    const today = pickDailyQuestion(p, 'user-a', '2026-10-09');
    const tomorrow = pickDailyQuestion(p, 'user-a', '2026-10-10');
    expect(today).not.toEqual(tomorrow);
  });

  it('gives two players different questions on the same day', () => {
    const p = pool(100);
    const a = pickDailyQuestion(p, 'user-a', '2026-10-09');
    const b = pickDailyQuestion(p, 'user-b', '2026-10-09');
    expect(a).not.toEqual(b);
  });

  it('shows every question before repeating any', () => {
    // The whole point: a 252-question pool lasts 252 days, not a weekend
    const size = 60;
    const p = pool(size);
    const seen = new Set<string>();
    for (let d = 0; d < size; d++) {
      const date = new Date(Date.UTC(2026, 0, 1 + d)).toISOString().slice(0, 10);
      const q = pickDailyQuestion(p, 'user-a', date)!;
      seen.add(`${q.itemId}:${q.index}`);
    }
    expect(seen.size).toBe(size);
  });

  it('wraps round rather than running out', () => {
    const p = pool(5);
    const first = pickDailyQuestion(p, 'user-a', '2026-01-01');
    const afterFullCycle = pickDailyQuestion(p, 'user-a', '2026-01-06');
    expect(afterFullCycle).toEqual(first);
  });

  it('returns null when there are no questions at all', () => {
    expect(pickDailyQuestion([], 'user-a', '2026-10-09')).toBeNull();
  });

  it('handles a single-question pool', () => {
    const one = pool(1);
    expect(pickDailyQuestion(one, 'user-a', '2026-10-09')).toEqual(one[0]);
  });

  it('copes with dates before the epoch rather than indexing negatively', () => {
    const q = pickDailyQuestion(pool(10), 'user-a', '1950-05-05');
    expect(q).not.toBeNull();
    expect(pool(10)).toContainEqual(q!);
  });
});

describe('dayNumber', () => {
  it('advances by one per calendar day', () => {
    expect(dayNumber('2026-10-10') - dayNumber('2026-10-09')).toBe(1);
  });

  it('is stable for the same date', () => {
    expect(dayNumber('2026-10-09')).toBe(dayNumber('2026-10-09'));
  });
});

describe('daysUntilRepeat', () => {
  it('counts down through the cycle', () => {
    const size = 10;
    const a = daysUntilRepeat(size, '2026-01-01');
    const b = daysUntilRepeat(size, '2026-01-02');
    expect(b).toBe(a - 1);
  });

  it('never reports more than the pool holds, or less than one', () => {
    for (const d of ['2026-01-01', '2026-06-15', '2026-12-31']) {
      const n = daysUntilRepeat(252, d);
      expect(n).toBeGreaterThan(0);
      expect(n).toBeLessThanOrEqual(252);
    }
  });

  it('is zero for an empty pool', () => {
    expect(daysUntilRepeat(0, '2026-10-09')).toBe(0);
  });
});
