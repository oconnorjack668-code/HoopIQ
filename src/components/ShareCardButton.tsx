// src/components/ShareCardButton.tsx
'use client';

import React, { useState } from 'react';
import { Share2 } from 'lucide-react';

/**
 * Downloads a share card from /api/share/... and opens the phone's share sheet
 * (Instagram, TikTok, WhatsApp…). Falls back to downloading the image.
 */
export function ShareCardButton({ path, text, label = 'Share' }: { path: string; text: string; label?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function share() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(path);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const file = new File([blob], 'hoopiq.png', { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text });
        return;
      }
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = 'hoopiq.png';
      a.click();
      setTimeout(() => URL.revokeObjectURL(href), 5000);
    } catch (err) {
      // Closing the share sheet is not an error
      if (!(err instanceof DOMException && err.name === 'AbortError')) setError('Could not create the image. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start">
      <button
        type="button"
        onClick={() => void share()}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 to-pink-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
      >
        <Share2 className={`h-4 w-4 ${busy ? 'animate-pulse' : ''}`} /> {busy ? 'Making image…' : label}
      </button>
      {error && <span className="mt-1 text-xs text-red-400">{error}</span>}
    </span>
  );
}
