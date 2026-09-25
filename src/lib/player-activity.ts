// src/lib/player-activity.ts
// SERVER-ONLY: the player's training history that several screens need (dashboard, achievements,
// goals, basketball, style match). Each loader is wrapped in React cache(), so the dashboard,
// which shows metrics and achievements together, reads each table once per request instead of
// two or three times.
//
// Supabase returns at most 1,000 rows per request, so long histories are read page by page
// (a single request would silently stop counting after 1,000 rows).
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';

export const PAGE_SIZE = 1000;

type PageResult<T> = { data: T[] | null; error: unknown };

/** Reads every row of a query, PAGE_SIZE rows at a time. The query must have a stable order. */
export async function fetchAllRows<T>(
  page: (from: number, to: number) => PromiseLike<PageResult<T>>,
  maxRows = 50_000
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; from < maxRows; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error || !data) break;
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
  }
  return rows;
}

export interface ZoneTotal {
  zone: string;
  makes: number;
  attempts: number;
}

/** Adds up shooting rows per zone. */
export function totalsByZone(rows: Array<{ shot_zone: string; makes: number; attempts: number }>): ZoneTotal[] {
  const zones = new Map<string, ZoneTotal>();
  for (const r of rows) {
    const z = zones.get(r.shot_zone) || { zone: r.shot_zone, makes: 0, attempts: 0 };
    z.makes += Number(r.makes) || 0;
    z.attempts += Number(r.attempts) || 0;
    zones.set(r.shot_zone, z);
  }
  return [...zones.values()];
}

/** Every date the player logged a basketball session / a gym workout ("YYYY-MM-DD", repeats kept). */
export const getTrainingDates = cache(async (userId: string): Promise<{ sessions: string[]; workouts: string[] }> => {
  const supabase = (await createClient()) as any;
  const [sessions, workouts] = await Promise.all([
    fetchAllRows<{ session_date: string }>((from, to) =>
      supabase
        .from('training_sessions')
        .select('session_date')
        .eq('user_id', userId)
        .order('session_date', { ascending: false })
        .order('id')
        .range(from, to)
    ),
    fetchAllRows<{ workout_date: string }>((from, to) =>
      supabase
        .from('workouts')
        .select('workout_date')
        .eq('user_id', userId)
        .order('workout_date', { ascending: false })
        .order('id')
        .range(from, to)
    ),
  ]);
  return { sessions: sessions.map((s) => s.session_date), workouts: workouts.map((w) => w.workout_date) };
});

/**
 * Career makes/attempts per court zone. Uses the my_shot_totals() database function
 * (migration 00023, one small row per zone); until that migration runs it adds up the rows here.
 */
export const getShotTotals = cache(async (userId: string): Promise<ZoneTotal[]> => {
  const supabase = (await createClient()) as any;
  const { data, error } = await supabase.rpc('my_shot_totals');
  if (!error && Array.isArray(data)) {
    return totalsByZone(data as Array<{ shot_zone: string; makes: number; attempts: number }>);
  }
  const rows = await fetchAllRows<{ shot_zone: string; makes: number; attempts: number }>((from, to) =>
    supabase.from('shooting_entries').select('shot_zone, makes, attempts').eq('user_id', userId).order('id').range(from, to)
  );
  return totalsByZone(rows);
});

/** Shooting rows logged since an instant (e.g. the start of this week). */
export const getShotsSince = cache(async (userId: string, sinceIso: string): Promise<Array<{ makes: number; attempts: number }>> => {
  const supabase = (await createClient()) as any;
  return fetchAllRows<{ makes: number; attempts: number }>((from, to) =>
    supabase
      .from('shooting_entries')
      .select('makes, attempts')
      .eq('user_id', userId)
      .gte('created_at', sinceIso)
      .order('id')
      .range(from, to)
  );
});

/** Personal records across gym sets and athletic tests. */
export const getPersonalRecordCount = cache(async (userId: string): Promise<number> => {
  const supabase = (await createClient()) as any;
  const [{ count: sets }, { count: tests }] = await Promise.all([
    supabase.from('workout_sets').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('is_personal_record', true),
    supabase.from('performance_tests').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('is_personal_record', true),
  ]);
  return (sets || 0) + (tests || 0);
});
