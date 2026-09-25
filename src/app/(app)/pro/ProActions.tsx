// src/app/(app)/pro/ProActions.tsx
'use client';

import React, { useState, useSyncExternalStore } from 'react';
import { Button } from '@/components/ui/Button';
import { isPlayStoreApp } from '@/lib/platform';

const noSubscribe = () => () => undefined;

export function ProActions({ isPro, hasYearly }: { isPro: boolean; hasYearly: boolean }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Server render: false; on the phone: read the flag set at launch
  const playApp = useSyncExternalStore(noSubscribe, isPlayStoreApp, () => false);

  // Google Play rules: no Stripe checkout inside the Play Store app
  if (playApp && !isPro) {
    return (
      <p className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3 text-sm text-zinc-400">
        Upgrading to Pro isn&apos;t available in this version of the app yet.
      </p>
    );
  }

  async function go(path: string, body?: object, key = path) {
    setBusy(key);
    setError(null);
    try {
      const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error || 'Something went wrong. Please try again.');
        return;
      }
      window.location.href = data.url;
    } catch {
      setError('Network error. Check your connection and try again.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-2">
      {isPro ? (
        <Button variant="secondary" size="lg" className="w-full" isLoading={busy === 'portal'} onClick={() => go('/api/billing/portal', undefined, 'portal')}>
          Manage subscription
        </Button>
      ) : (
        <>
          <Button variant="primary" size="lg" className="w-full" isLoading={busy === 'month'} onClick={() => go('/api/billing/checkout', { interval: 'month' }, 'month')}>
            Upgrade monthly
          </Button>
          {hasYearly && (
            <Button variant="outline" size="lg" className="w-full" isLoading={busy === 'year'} onClick={() => go('/api/billing/checkout', { interval: 'year' }, 'year')}>
              Upgrade yearly (best value)
            </Button>
          )}
        </>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
