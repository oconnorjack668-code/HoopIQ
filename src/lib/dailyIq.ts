// src/lib/dailyIq.ts
// Picking one Basketball IQ question per player per day.
//
// The IQ section is finite - 12 sections, 36 lessons, a few hundred questions -
// so a player who works through it has nothing left. Content alone never fixes
// that: any pile can be finished. What fixes it is that the questions keep
// coming back, one a day, in an order that is this player's own.
//
// The order is a shuffle seeded by the player's id, then indexed by the day
// number. That means: the same question for the whole of a given day however
// often the page is reloaded, a different running order for every player, and -
// because it walks the shuffled list rather than picking at random - every
// question appears once before any question appears twice.

export interface QuestionRef {
  itemId: string;
  /** Index into that lesson's quiz_questions array. */
  index: number;
}

/** FNV-1a. Small, stable across runs, and well spread for short strings. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** Deterministic PRNG so a given seed always yields the same sequence. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates driven by the seeded PRNG. Does not mutate the input. */
export function seededShuffle<T>(items: T[], seed: string): T[] {
  const out = [...items];
  const rand = mulberry32(hash(seed));
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Whole days since the epoch for a "YYYY-MM-DD" date. */
export function dayNumber(date: string): number {
  return Math.floor(Date.parse(`${date}T00:00:00Z`) / 86_400_000);
}

/**
 * The question for this player on this date, or null when there are none.
 * Walks a per-player shuffle, so the whole pool is seen before anything repeats.
 */
export function pickDailyQuestion(pool: QuestionRef[], userId: string, date: string): QuestionRef | null {
  if (pool.length === 0) return null;
  const order = seededShuffle(pool, userId);
  // Positive modulo: dayNumber is negative for dates before 1970
  const i = ((dayNumber(date) % order.length) + order.length) % order.length;
  return order[i];
}

/** How many days of questions remain before this player starts seeing repeats. */
export function daysUntilRepeat(poolSize: number, date: string): number {
  if (poolSize === 0) return 0;
  const used = ((dayNumber(date) % poolSize) + poolSize) % poolSize;
  return poolSize - used;
}
