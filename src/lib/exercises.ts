// src/lib/exercises.ts
// Muscle groups (exercise_library.primary_muscle) and set helpers for the gym logger.

export const MUSCLE_GROUPS = [
  { id: 'chest', label: 'Chest', category: 'upper_body_push' },
  { id: 'back', label: 'Back', category: 'upper_body_pull' },
  { id: 'shoulders', label: 'Shoulders', category: 'upper_body_push' },
  { id: 'biceps', label: 'Biceps', category: 'upper_body_pull' },
  { id: 'triceps', label: 'Triceps', category: 'upper_body_push' },
  { id: 'forearms', label: 'Forearms & Grip', category: 'upper_body_pull' },
  { id: 'quads', label: 'Quads', category: 'legs' },
  { id: 'hamstrings', label: 'Hamstrings', category: 'legs' },
  { id: 'glutes', label: 'Glutes', category: 'legs' },
  { id: 'calves', label: 'Calves', category: 'legs' },
  { id: 'core', label: 'Core', category: 'core' },
  { id: 'full_body', label: 'Full Body', category: 'legs' },
  { id: 'plyometrics', label: 'Explosiveness & Plyos', category: 'plyometrics' },
  { id: 'mobility', label: 'Mobility', category: 'mobility' },
  { id: 'conditioning', label: 'Conditioning', category: 'conditioning' },
  { id: 'injury_prevention', label: 'Injury Prevention', category: 'recovery' },
] as const;

export type MuscleGroupId = (typeof MUSCLE_GROUPS)[number]['id'];

export function muscleLabel(id: string | null | undefined): string {
  return MUSCLE_GROUPS.find((m) => m.id === id)?.label || 'Other';
}

export function categoryForMuscle(id: string): string {
  return MUSCLE_GROUPS.find((m) => m.id === id)?.category || 'conditioning';
}

export interface LibraryExercise {
  id: string;
  name: string;
  primary_muscle: string | null;
  equipment: string[];
  description: string | null;
  cues: string[];
  is_basketball_specific: boolean;
  is_system: boolean;
}

/**
 * Score used to detect personal records. Weighted sets use estimated one-rep max
 * (Epley: weight x (1 + reps / 30)); bodyweight sets compare reps.
 */
export function setScore(weightKg: number | null, reps: number | null): number {
  if (!reps || reps <= 0) return 0;
  if (!weightKg || weightKg <= 0) return reps;
  return weightKg * (1 + reps / 30);
}

/** A set is a PR when it beats every earlier set of the same kind (weighted vs bodyweight). */
export function isPersonalRecord(
  weightKg: number | null,
  reps: number | null,
  history: Array<{ weight_kg: number | null; reps: number | null }>
): boolean {
  const score = setScore(weightKg, reps);
  if (score <= 0) return false;
  const weighted = !!weightKg && weightKg > 0;
  const comparable = history.filter((h) => (!!h.weight_kg && h.weight_kg > 0) === weighted);
  if (comparable.length === 0) return false; // first time logging it isn't a "record"
  return comparable.every((h) => score > setScore(h.weight_kg, h.reps));
}
