// src/lib/fuel.ts
// Fuelling habits around training: did you eat, did you drink, did you sleep,
// how did you feel.
//
// Deliberately NOT a calorie or macro tracker. Players here start at 13, and a
// numeric intake target aimed at teenagers is a well-documented route into
// disordered eating - it would also contradict the app's own AI safety rules,
// which already forbid extreme dieting advice and keep nutrition guidance
// general for under-18s. There is no total to minimise here and no score to
// optimise: just habits, and whether they line up with feeling good.

export type Hydration = 'low' | 'ok' | 'good';
export const HYDRATION_LEVELS: Hydration[] = ['low', 'ok', 'good'];

export interface FuelEntry {
  /** "YYYY-MM-DD" */
  log_date: string;
  ate_before: boolean | null;
  ate_after: boolean | null;
  hydration: Hydration | null;
  /** Hours, to one decimal */
  sleep_hours: number | null;
  /** 1 (flat) to 5 (flying) */
  energy: number | null;
}

/** Fewest days on each side of a comparison before it is worth showing. */
export const MIN_DAYS_FOR_INSIGHT = 5;

export const SLEEP_MIN = 0;
export const SLEEP_MAX = 16;
export const ENERGY_MIN = 1;
export const ENERGY_MAX = 5;

export function isValidEnergy(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= ENERGY_MIN && v <= ENERGY_MAX;
}

export function isValidSleep(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= SLEEP_MIN && v <= SLEEP_MAX;
}

export function isHydration(v: unknown): v is Hydration {
  return typeof v === 'string' && (HYDRATION_LEVELS as string[]).includes(v);
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const round1 = (n: number) => Math.round(n * 10) / 10;

export interface FuelSummary {
  daysLogged: number;
  ateBeforeRate: number | null;
  averageSleep: number | null;
  averageEnergy: number | null;
}

/** Plain description of the last N entries. No composite score, by design. */
export function summarise(entries: FuelEntry[]): FuelSummary {
  const before = entries.filter((e) => e.ate_before !== null);
  const sleeps = entries.map((e) => e.sleep_hours).filter(isValidSleep);
  const energies = entries.map((e) => e.energy).filter(isValidEnergy);
  return {
    daysLogged: new Set(entries.map((e) => e.log_date)).size,
    ateBeforeRate: before.length ? Math.round((before.filter((e) => e.ate_before).length / before.length) * 100) : null,
    averageSleep: sleeps.length ? round1(mean(sleeps)) : null,
    averageEnergy: energies.length ? round1(mean(energies)) : null,
  };
}

export interface FuelInsight {
  enoughData: boolean;
  message: string;
  withFood?: number;
  withoutFood?: number;
}

/**
 * Does eating beforehand line up with feeling better?
 *
 * This is a correlation across a handful of self-reported days, not evidence of
 * anything, so the wording stays tentative and it refuses to say anything at
 * all below MIN_DAYS_FOR_INSIGHT on each side.
 */
export function eatingBeforeInsight(entries: FuelEntry[]): FuelInsight {
  const usable = entries.filter((e) => e.ate_before !== null && isValidEnergy(e.energy));
  const fed = usable.filter((e) => e.ate_before).map((e) => e.energy as number);
  const unfed = usable.filter((e) => !e.ate_before).map((e) => e.energy as number);

  if (fed.length < MIN_DAYS_FOR_INSIGHT || unfed.length < MIN_DAYS_FOR_INSIGHT) {
    return {
      enoughData: false,
      message: `Log a few more days and this will compare how you feel when you have eaten beforehand against when you have not. It needs ${MIN_DAYS_FOR_INSIGHT} of each.`,
    };
  }

  const withFood = round1(mean(fed));
  const withoutFood = round1(mean(unfed));
  const gap = withFood - withoutFood;

  if (Math.abs(gap) < 0.5) {
    return {
      enoughData: true,
      withFood,
      withoutFood,
      message: `Your energy is about the same either way so far (${withFood} vs ${withoutFood} out of 5).`,
    };
  }

  return {
    enoughData: true,
    withFood,
    withoutFood,
    message:
      gap > 0
        ? `You tend to feel better when you have eaten beforehand: ${withFood} out of 5 against ${withoutFood} when you have not.`
        : `Oddly, you have rated your energy higher on days you did not eat beforehand (${withoutFood} against ${withFood}). Worth watching rather than acting on yet.`,
  };
}
