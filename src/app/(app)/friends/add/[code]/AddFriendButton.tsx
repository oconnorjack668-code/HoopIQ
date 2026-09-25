// src/app/(app)/friends/add/[code]/AddFriendButton.tsx
'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { REQUEST_MESSAGES, type RequestResult } from '@/lib/friends';

export function AddFriendButton({ code }: { code: string }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function add() {
    setBusy(true);
    const { data, error } = await (createClient() as any).rpc('send_friend_request', { p_code: code });
    setBusy(false);
    setResult(error ? error.message : REQUEST_MESSAGES[data as RequestResult] || 'Done.');
  }

  if (result) return <p className="text-sm font-semibold text-cyan-300">{result}</p>;
  return (
    <Button variant="primary" size="lg" className="w-full" isLoading={busy} onClick={add}>
      Add friend
    </Button>
  );
}
