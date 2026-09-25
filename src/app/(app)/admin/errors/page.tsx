// src/app/(app)/admin/errors/page.tsx
// Owner-only crash report viewer (reports come from /api/errors and src/instrumentation.ts).
import React from 'react';
import { notFound } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { checkIsOwner } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { Bug, CheckCircle2 } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'App errors - HoopIQ' };

interface ErrorRow {
  id: string;
  created_at: string;
  user_id: string | null;
  source: string;
  message: string;
  stack: string | null;
  digest: string | null;
  url: string | null;
  user_agent: string | null;
}

async function markResolved(formData: FormData) {
  'use server';
  if (!(await checkIsOwner())) return;
  const message = String(formData.get('message') || '');
  if (!message) return;
  await (createAdminClient() as any).from('app_errors').update({ resolved: true }).eq('message', message).eq('resolved', false);
  revalidatePath('/admin/errors');
}

function device(userAgent: string | null): string {
  if (!userAgent) return 'unknown device';
  if (/iPhone|iPad/.test(userAgent)) return 'iPhone/iPad';
  if (/Android/.test(userAgent)) return 'Android';
  if (/Windows/.test(userAgent)) return 'Windows';
  if (/Mac OS/.test(userAgent)) return 'Mac';
  return 'other';
}

export default async function AdminErrorsPage() {
  if (!(await checkIsOwner())) notFound();

  let rows: ErrorRow[] = [];
  let loadError: string | null = null;
  try {
    const { data, error } = await (createAdminClient() as any)
      .from('app_errors')
      .select('id, created_at, user_id, source, message, stack, digest, url, user_agent')
      .eq('resolved', false)
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) loadError = error.message;
    rows = (data || []) as ErrorRow[];
  } catch (e) {
    loadError = e instanceof Error ? e.message : 'Could not load errors';
  }

  // Group identical messages so one bug hitting many players shows once
  const groups = new Map<string, { latest: ErrorRow; count: number; players: Set<string>; pages: Set<string> }>();
  for (const row of rows) {
    const g = groups.get(row.message) || { latest: row, count: 0, players: new Set<string>(), pages: new Set<string>() };
    g.count += 1;
    if (row.user_id) g.players.add(row.user_id);
    if (row.url) g.pages.add(row.url.split('?')[0]);
    groups.set(row.message, g);
  }
  const list = [...groups.values()].sort((a, b) => b.count - a.count);

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-red-600/20 flex items-center justify-center">
            <Bug className="h-6 w-6 text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">App errors</h1>
            <p className="text-sm text-zinc-400">Crashes players hit, newest reports kept for 90 days. Only you can see this.</p>
          </div>
        </div>

        {loadError && (
          <p className="rounded-xl border border-amber-600/40 bg-amber-600/10 p-3 text-sm text-amber-200">
            Could not load errors: {loadError}. Has migration 00020_app_errors.sql been run in Supabase?
          </p>
        )}

        {!loadError && list.length === 0 && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-10 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto mb-2" />
            <p className="font-semibold text-white">No open errors</p>
            <p className="text-sm text-zinc-400">Nice. New crashes will show up here automatically.</p>
          </div>
        )}

        {list.map(({ latest, count, players, pages }) => (
          <details key={latest.message} className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
            <summary className="cursor-pointer list-none">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-sm text-red-300 break-words">{latest.message}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {latest.source} · {[...pages].slice(0, 3).join(', ') || 'unknown page'} · last{' '}
                    {new Date(latest.created_at).toLocaleString('en-IE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} ·{' '}
                    {device(latest.user_agent)}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-lg font-black text-white">{count}×</div>
                  <div className="text-[11px] text-zinc-500">{players.size} {players.size === 1 ? 'player' : 'players'}</div>
                </div>
              </div>
            </summary>
            {latest.stack && (
              <pre className="mt-3 max-h-64 overflow-auto rounded-lg bg-zinc-950 p-3 text-[11px] text-zinc-400 whitespace-pre-wrap">{latest.stack}</pre>
            )}
            {latest.digest && <p className="mt-2 text-xs text-zinc-500">Digest: {latest.digest}</p>}
            <form action={markResolved} className="mt-3">
              <input type="hidden" name="message" value={latest.message} />
              <button type="submit" className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-700">
                Mark fixed
              </button>
            </form>
          </details>
        ))}
      </div>
    </div>
  );
}
