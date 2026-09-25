// src/lib/programs.ts
import type { SupabaseClient } from '@supabase/supabase-js';

export type ProgramItem =
  | { type: 'drill'; slug: string; note?: string }
  | { type: 'exercise'; name: string; sets?: number; reps?: string }
  | { type: 'study'; topic_slug: string }
  | { type: 'test'; test_type: string }
  | { type: 'note'; text: string };

export interface Program {
  id: string;
  slug: string;
  name: string;
  description: string;
  goal: string;
  level: string;
  position: string;
  weeks: number;
  sessions_per_week: number;
  season: string;
}

export interface ProgramDay {
  id: string;
  program_id: string;
  week: number;
  day: number;
  title: string;
  focus: string;
  estimated_minutes: number;
  items: ProgramItem[];
}

export const GOAL_LABELS: Record<string, string> = {
  shooting: 'Shooting',
  ball_handling: 'Ball Handling',
  finishing: 'Finishing',
  athleticism: 'Athleticism',
  vertical: 'Vertical Jump',
  complete: 'Complete Player',
  in_season: 'In-Season',
};

export function sortDays<T extends { week: number; day: number }>(days: T[]): T[] {
  return [...days].sort((a, b) => a.week - b.week || a.day - b.day);
}

/** The first day (in week/day order) that hasn't been completed, or null when the program is finished. */
export function nextDay<T extends { id: string; week: number; day: number }>(days: T[], completedIds: Set<string>): T | null {
  return sortDays(days).find((d) => !completedIds.has(d.id)) || null;
}

/** Deep link that opens the hoops tracker with the day's drills. */
export function courtLink(items: ProgramItem[]): string | null {
  const slugs = items.filter((i): i is Extract<ProgramItem, { type: 'drill' }> => i.type === 'drill').map((i) => i.slug);
  return slugs.length ? `/basketball/new?drills=${slugs.map(encodeURIComponent).join(',')}` : null;
}

/** Deep link that opens the gym logger with the day's exercises and target sets. */
export function gymLink(items: ProgramItem[]): string | null {
  const exercises = items.filter((i): i is Extract<ProgramItem, { type: 'exercise' }> => i.type === 'exercise');
  if (!exercises.length) return null;
  const param = exercises.map((e) => `${e.name}~${e.sets || 3}`).join('|');
  return `/workouts/new?exercises=${encodeURIComponent(param)}`;
}

/** The player's active enrollment with its program, days and completed day ids. */
export async function getActiveProgram(supabase: SupabaseClient, userId: string) {
  const { data: enrollment } = await (supabase as any)
    .from('program_enrollments')
    .select('id, started_at, training_programs(*)')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();
  if (!enrollment?.training_programs) return null;

  const program = enrollment.training_programs as Program;
  const [{ data: days }, { data: completions }] = await Promise.all([
    (supabase as any).from('program_days').select('*').eq('program_id', program.id),
    (supabase as any).from('program_day_completions').select('program_day_id').eq('enrollment_id', enrollment.id),
  ]);
  const completedIds = new Set<string>(((completions || []) as Array<{ program_day_id: string }>).map((c) => c.program_day_id));
  const allDays = sortDays((days || []) as ProgramDay[]);
  return {
    enrollmentId: enrollment.id as string,
    program,
    days: allDays,
    completedIds,
    next: nextDay(allDays, completedIds),
  };
}
