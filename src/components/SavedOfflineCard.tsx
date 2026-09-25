// src/components/SavedOfflineCard.tsx
'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { CloudOff } from 'lucide-react';

/** Shown after a session was stored on the phone because there was no connection. */
export function SavedOfflineCard({ what, backHref, onAnother }: { what: string; backHref: string; onAnother: () => void }) {
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="max-w-sm w-full rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/15">
          <CloudOff className="h-7 w-7 text-orange-400" />
        </div>
        <h1 className="text-xl font-black text-white">Saved on your phone</h1>
        <p className="mt-2 text-sm text-zinc-400">
          No signal right now, so your {what} is stored on this phone. It uploads automatically as soon as you are back
          online. Keep HoopIQ installed and don&apos;t clear its data until then.
        </p>
        <div className="mt-5 space-y-2">
          <Button variant="primary" size="lg" className="w-full" onClick={onAnother}>
            Log another {what}
          </Button>
          <a href={backHref} className="block text-sm text-zinc-400 underline">
            Back
          </a>
        </div>
      </div>
    </div>
  );
}
