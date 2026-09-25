// src/lib/offline.ts
// Offline logging: finished sessions that cannot reach Supabase are kept in a queue on the
// phone and uploaded by <OfflineSync /> when the connection comes back.
//
// Every save carries a client-generated id. A retry first deletes that id (children cascade),
// so a save that half-finished before the signal dropped is never duplicated.

export type QueueKind = 'basketball' | 'workout';

export interface BasketballSavePayload {
  id: string;
  session: {
    session_date: string;
    session_type: string;
    duration_minutes: number;
    intensity_rpe: number;
    perceived_quality: number;
    notes: string | null;
  };
  drills: Array<{
    name: string;
    category: string;
    minutes: number | null;
    zones: Array<{ zone: string; makes: number; attempts: number }>;
  }>;
}

export interface WorkoutSavePayload {
  id: string;
  workout: {
    workout_date: string;
    workout_type: string;
    duration_minutes: number;
    rpe: number;
    notes: string | null;
  };
  sets: Array<{
    exercise_id: string | null;
    exercise_name: string;
    exercise_category: string | null;
    set_number: number;
    reps: number;
    weight_kg: number | null;
    is_personal_record: boolean;
  }>;
  routine: {
    name: string;
    exercises: Array<{ exercise_id: string | null; exercise_name: string; target_sets: number; display_order: number }>;
  } | null;
}

export type QueuedSave =
  | { id: string; kind: 'basketball'; userId: string; label: string; createdAt: number; lastError?: string; payload: BasketballSavePayload }
  | { id: string; kind: 'workout'; userId: string; label: string; createdAt: number; lastError?: string; payload: WorkoutSavePayload };

export interface SaveResult {
  id?: string;
  error?: string;
  /** true when the failure was the connection, so the save should be queued */
  network?: boolean;
}

const QUEUE_KEY = 'hoopiq-offline-queue-v1';
export const QUEUE_EVENT = 'hoopiq-queue-changed';

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  // RFC 4122 v4 fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

const NETWORK_MESSAGE = /failed to fetch|networkerror|network request failed|load failed|fetch failed|network error|timed? ?out/i;

export function isNetworkError(message: string | null | undefined): boolean {
  return isOffline() || (!!message && NETWORK_MESSAGE.test(message));
}

export function readQueue(): QueuedSave[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    const items = raw ? (JSON.parse(raw) as QueuedSave[]) : [];
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

function writeQueue(items: QueuedSave[]) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
  } catch {
    // storage full or blocked: nothing else we can do on the device
  }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(QUEUE_EVENT));
}

export function enqueue(item: QueuedSave) {
  writeQueue([...readQueue().filter((q) => q.id !== item.id), item]);
}

export function removeFromQueue(id: string) {
  writeQueue(readQueue().filter((q) => q.id !== id));
}

export function markQueueError(id: string, message: string) {
  writeQueue(readQueue().map((q) => (q.id === id ? { ...q, lastError: message } : q)));
}

/** The signed-in user's id, read from the local session when there is no connection. */
export async function getUserIdForSave(supabase: any): Promise<string | null> {
  if (!isOffline()) {
    const { data, error } = await supabase.auth.getUser();
    if (data?.user?.id) return data.user.id;
    if (error && !isNetworkError(error.message)) return null;
  }
  const { data } = await supabase.auth.getSession();
  return data?.session?.user?.id ?? null;
}

function fail(message: string | undefined, fallback: string): SaveResult {
  const text = message || fallback;
  return { error: text, network: isNetworkError(text) };
}

export async function saveBasketballSession(
  supabase: any,
  userId: string,
  p: BasketballSavePayload,
  retry = false
): Promise<SaveResult> {
  if (retry) {
    const { error } = await supabase.from('training_sessions').delete().eq('id', p.id);
    if (error) return fail(error.message, 'Could not reach the server');
  }

  const { error: sessionError } = await supabase.from('training_sessions').insert({ id: p.id, user_id: userId, ...p.session });
  if (sessionError) return fail(sessionError.message, 'Could not save the session');

  for (const [i, drill] of p.drills.entries()) {
    const drillId = newId();
    const { error: drillError } = await supabase.from('session_drills').insert({
      id: drillId,
      session_id: p.id,
      user_id: userId,
      drill_name: drill.name.slice(0, 120),
      drill_category: drill.category,
      duration_minutes: drill.minutes,
      display_order: i,
    });
    let error = drillError;
    if (!error && drill.zones.length > 0) {
      ({ error } = await supabase
        .from('shooting_entries')
        .insert(drill.zones.map((z) => ({ drill_id: drillId, user_id: userId, shot_zone: z.zone, makes: z.makes, attempts: z.attempts }))));
    }
    if (error) {
      // Undo the partial session (drills and shots cascade)
      await supabase.from('training_sessions').delete().eq('id', p.id);
      return fail(error.message, `Could not save "${drill.name}"`);
    }
  }
  return { id: p.id };
}

export async function saveWorkout(supabase: any, userId: string, p: WorkoutSavePayload, retry = false): Promise<SaveResult> {
  if (retry) {
    const { error } = await supabase.from('workouts').delete().eq('id', p.id);
    if (error) return fail(error.message, 'Could not reach the server');
  }

  const { error: workoutError } = await supabase.from('workouts').insert({ id: p.id, user_id: userId, ...p.workout });
  if (workoutError) return fail(workoutError.message, 'Could not save the workout');

  const { error: setsError } = await supabase
    .from('workout_sets')
    .insert(p.sets.map((s) => ({ ...s, workout_id: p.id, user_id: userId })));
  if (setsError) {
    await supabase.from('workouts').delete().eq('id', p.id);
    return fail(setsError.message, 'Could not save your sets');
  }

  if (p.routine) {
    // Optional extra: a failure here does not undo the workout
    const { data: routine } = await supabase
      .from('workout_routines')
      .insert({ user_id: userId, name: p.routine.name })
      .select('id')
      .single();
    if (routine) {
      await supabase
        .from('routine_exercises')
        .insert(p.routine.exercises.map((e) => ({ ...e, routine_id: routine.id, user_id: userId })));
    }
  }
  return { id: p.id };
}

export async function runQueuedSave(supabase: any, item: QueuedSave): Promise<SaveResult> {
  return item.kind === 'basketball'
    ? saveBasketballSession(supabase, item.userId, item.payload, true)
    : saveWorkout(supabase, item.userId, item.payload, true);
}
