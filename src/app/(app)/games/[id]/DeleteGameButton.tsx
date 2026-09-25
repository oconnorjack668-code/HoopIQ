// src/app/(app)/games/[id]/DeleteGameButton.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function DeleteGameButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!window.confirm('Delete this game? This cannot be undone.')) return;
    setBusy(true);
    const { error } = await (createClient() as any).from('games').delete().eq('id', id);
    if (error) {
      setBusy(false);
      window.alert(`Could not delete: ${error.message}`);
      return;
    }
    router.push('/games');
    router.refresh();
  }

  return (
    <button type="button" onClick={() => void remove()} disabled={busy} className="w-full text-center text-xs text-red-400/80 underline disabled:opacity-50">
      {busy ? 'Deleting…' : 'Delete game'}
    </button>
  );
}
