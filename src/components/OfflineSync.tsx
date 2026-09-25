// src/components/OfflineSync.tsx
'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  QUEUE_EVENT,
  getUserIdForSave,
  isOffline,
  markQueueError,
  readQueue,
  removeFromQueue,
  runQueuedSave,
  type QueuedSave,
} from '@/lib/offline';
import { CloudOff, CloudUpload, Check } from 'lucide-react';

const WARM_KEY = 'hoopiq-offline-warmed';

/**
 * Uploads sessions saved with no signal, and shows a small status pill above the bottom nav:
 * offline notice, "uploading", "uploaded", or a stuck item the player can retry or discard.
 */
export function OfflineSync() {
  const router = useRouter();
  const [offline, setOffline] = useState(false);
  const [queue, setQueue] = useState<QueuedSave[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [uploaded, setUploaded] = useState(0);
  const running = useRef(false);

  const sync = useCallback(async () => {
    if (running.current || isOffline()) return;
    const pending = readQueue();
    if (pending.length === 0) return;
    running.current = true;
    setSyncing(true);
    const supabase = createClient() as any;
    const userId = await getUserIdForSave(supabase);
    let done = 0;
    for (const item of pending) {
      // Only the player who logged it can upload it (the database would refuse anyway)
      if (!userId || item.userId !== userId) continue;
      const result = await runQueuedSave(supabase, item);
      if (result.network) break; // signal dropped again: try later
      if (result.error) {
        markQueueError(item.id, result.error);
        continue;
      }
      removeFromQueue(item.id);
      done += 1;
    }
    running.current = false;
    setSyncing(false);
    if (done > 0) {
      setUploaded(done);
      router.refresh();
      setTimeout(() => setUploaded(0), 4000);
    }
  }, [router]);

  useEffect(() => {
    const refresh = () => {
      setQueue(readQueue());
      setOffline(isOffline());
    };
    const online = () => {
      refresh();
      void sync();
    };
    const visible = () => {
      if (document.visibilityState === 'visible') online();
    };
    const first = window.setTimeout(online, 0);
    // Store the loggers for offline use (at most once per day)
    try {
      const today = new Date().toDateString();
      if (!isOffline() && navigator.serviceWorker?.controller && localStorage.getItem(WARM_KEY) !== today) {
        navigator.serviceWorker.controller.postMessage({ type: 'warm-offline-pages' });
        localStorage.setItem(WARM_KEY, today);
      }
    } catch {
      // storage or service worker unavailable
    }
    window.addEventListener(QUEUE_EVENT, refresh);
    window.addEventListener('online', online);
    window.addEventListener('offline', refresh);
    document.addEventListener('visibilitychange', visible);
    return () => {
      window.clearTimeout(first);
      window.removeEventListener(QUEUE_EVENT, refresh);
      window.removeEventListener('online', online);
      window.removeEventListener('offline', refresh);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [sync]);

  const stuck = queue.find((q) => q.lastError);

  let content: React.ReactNode = null;
  if (uploaded > 0) {
    content = (
      <>
        <Check className="h-4 w-4 text-emerald-400" /> {uploaded} offline {uploaded === 1 ? 'session' : 'sessions'} uploaded
      </>
    );
  } else if (offline) {
    content = (
      <>
        <CloudOff className="h-4 w-4 text-orange-400" />
        {queue.length > 0 ? `Offline · ${queue.length} waiting to upload` : 'Offline · you can still log sessions'}
      </>
    );
  } else if (stuck) {
    content = (
      <span className="flex flex-wrap items-center gap-2">
        <span>
          Couldn&apos;t upload {stuck.label}: {stuck.lastError}
        </span>
        <button type="button" className="underline" onClick={() => void sync()}>
          Retry
        </button>
        <button
          type="button"
          className="underline text-red-300"
          onClick={() => {
            if (window.confirm('Delete this saved session from your phone? It will be lost.')) removeFromQueue(stuck.id);
          }}
        >
          Discard
        </button>
      </span>
    );
  } else if (queue.length > 0) {
    content = (
      <>
        <CloudUpload className={`h-4 w-4 text-cyan-400 ${syncing ? 'animate-pulse' : ''}`} />
        {syncing ? 'Uploading saved sessions…' : `${queue.length} saved ${queue.length === 1 ? 'session' : 'sessions'} waiting to upload`}
      </>
    );
  }

  if (!content) return null;
  return (
    <div className="fixed inset-x-0 bottom-20 md:bottom-4 z-50 flex justify-center px-4 pointer-events-none" role="status" aria-live="polite">
      <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900/95 px-4 py-2 text-xs font-semibold text-zinc-200 shadow-lg max-w-md">
        {content}
      </div>
    </div>
  );
}
