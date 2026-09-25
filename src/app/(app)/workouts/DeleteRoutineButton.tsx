// src/app/(app)/workouts/DeleteRoutineButton.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';

export function DeleteRoutineButton({ routineId, name }: { routineId: string; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    if (!window.confirm(`Delete the routine "${name}"? Your logged workouts are not affected.`)) return;
    setBusy(true);
    // Loaded on tap so the workouts list doesn't ship the Supabase library up front
    const { createClient } = await import('@/lib/supabase/client');
    const { error } = await (createClient() as any).from('workout_routines').delete().eq('id', routineId);
    setBusy(false);
    if (error) {
      window.alert(`Could not delete the routine: ${error.message}`);
      return;
    }
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={busy}
      aria-label={`Delete routine ${name}`}
      className="h-9 w-9 flex items-center justify-center rounded-lg text-zinc-500 hover:text-red-400 disabled:opacity-50"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
