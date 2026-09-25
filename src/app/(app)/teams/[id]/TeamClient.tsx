// src/app/(app)/teams/[id]/TeamClient.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Check, Flame, Share2, Trash2, UserCog, X } from 'lucide-react';

export interface RosterRow {
  user_id: string;
  display_name: string;
  player_position: string | null;
  role: 'coach' | 'player';
  sessions_7d: number;
  workouts_7d: number;
  minutes_7d: number;
  makes_7d: number;
  attempts_7d: number;
  sessions_28d: number;
  streak: number;
  last_active: string | null;
  games: number;
  ppg: number | null;
  rpg: number | null;
  apg: number | null;
  fg_pct: number | null;
}

export interface Assignment {
  id: string;
  title: string;
  details: string | null;
  link: string | null;
  due_date: string | null;
  created_at: string;
}

// In-app places a coach can point an assignment at
const LINK_OPTIONS = [
  { value: '', label: 'No link' },
  { value: '/basketball/new', label: 'Log a hoops session' },
  { value: '/workouts/new', label: 'Log a workout' },
  { value: '/games/new', label: 'Log a game' },
  { value: '/video', label: 'Video: shot tracker / form check' },
  { value: '/programs', label: 'Programs' },
  { value: '/drills', label: 'Drill library' },
  { value: '/study', label: 'IQ Study' },
  { value: '/workouts/tests', label: 'Athletic tests' },
];

function lastSeen(date: string | null): string {
  if (!date) return 'never';
  const days = Math.round((Date.now() - new Date(`${date}T00:00:00`).getTime()) / 86_400_000);
  return days <= 0 ? 'today' : days === 1 ? 'yesterday' : `${days}d ago`;
}

export function TeamClient({
  teamId,
  teamName,
  joinCode,
  myId,
  isCoach,
  roster,
  assignments,
  completions,
}: {
  teamId: string;
  teamName: string;
  joinCode: string;
  myId: string;
  isCoach: boolean;
  roster: RosterRow[];
  assignments: Assignment[];
  completions: Array<{ assignment_id: string; user_id: string }>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [link, setLink] = useState('');
  const [due, setDue] = useState('');
  const [sort, setSort] = useState<'week' | 'ppg' | 'name'>('week');

  const players = roster.filter((r) => r.role === 'player');
  const doneBy = (assignmentId: string) => completions.filter((c) => c.assignment_id === assignmentId).map((c) => c.user_id);

  async function run(key: string, fn: () => Promise<{ error: { message: string } | null }>, success?: string) {
    setBusy(key);
    setMessage(null);
    const { error } = await fn();
    setBusy(null);
    if (error) {
      setMessage({ tone: 'error', text: error.message });
      return false;
    }
    if (success) setMessage({ tone: 'success', text: success });
    router.refresh();
    return true;
  }

  const db = () => createClient() as any;

  async function share() {
    const url = `${window.location.origin}/teams`;
    const text = `Join ${teamName} on HoopIQ! Open ${url} and enter team code ${joinCode}`;
    try {
      if (navigator.share) await navigator.share({ title: teamName, text });
      else {
        await navigator.clipboard.writeText(text);
        setMessage({ tone: 'success', text: 'Invite copied. Paste it in your team chat.' });
      }
    } catch {
      // share sheet closed
    }
  }

  async function addAssignment(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim().length < 2) return setMessage({ tone: 'error', text: 'Give the assignment a title.' });
    const ok = await run(
      'add',
      () =>
        db()
          .from('team_assignments')
          .insert({
            team_id: teamId,
            created_by: myId,
            title: title.trim().slice(0, 120),
            details: details.trim().slice(0, 2000) || null,
            link: link || null,
            due_date: due || null,
          }),
      'Assignment posted.'
    );
    if (ok) {
      setTitle('');
      setDetails('');
      setLink('');
      setDue('');
    }
  }

  const sorted = [...roster].sort((a, b) =>
    sort === 'name'
      ? a.display_name.localeCompare(b.display_name)
      : sort === 'ppg'
        ? (b.ppg ?? -1) - (a.ppg ?? -1)
        : b.sessions_7d + b.workouts_7d - (a.sessions_7d + a.workouts_7d) || b.minutes_7d - a.minutes_7d
  );

  return (
    <div className="space-y-6">
      {message && (
        <Alert variant={message.tone} title={message.tone === 'success' ? 'Done' : 'Check this'}>
          {message.text}
        </Alert>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
        <div>
          <div className="text-xs font-semibold uppercase text-zinc-500">Team code</div>
          <div className="text-2xl font-black tracking-[0.2em] text-white">{joinCode}</div>
        </div>
        <Button variant="secondary" className="gap-1.5" onClick={() => void share()}>
          <Share2 className="h-4 w-4" /> Invite players
        </Button>
      </div>

      {/* Assignments */}
      <section className="space-y-2">
        <h2 className="font-bold text-white">Assignments</h2>
        {isCoach && (
          <form onSubmit={addAssignment} className="rounded-2xl border border-cyan-800/40 bg-cyan-950/20 p-3 space-y-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 200 made shots before Friday"
              aria-label="Assignment title"
              maxLength={120}
              className="w-full rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm text-white"
            />
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Details (optional)"
              aria-label="Assignment details"
              rows={2}
              maxLength={2000}
              className="w-full rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm text-white"
            />
            <div className="grid grid-cols-2 gap-2">
              <select value={link} onChange={(e) => setLink(e.target.value)} aria-label="Link" className="rounded-lg bg-zinc-900 border border-zinc-800 px-2 py-2 text-sm text-white">
                {LINK_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <input type="date" value={due} onChange={(e) => setDue(e.target.value)} aria-label="Due date" className="rounded-lg bg-zinc-900 border border-zinc-800 px-2 py-2 text-sm text-white" />
            </div>
            <Button type="submit" variant="primary" size="sm" isLoading={busy === 'add'}>
              Post assignment
            </Button>
          </form>
        )}
        {assignments.length === 0 && <p className="text-sm text-zinc-500">{isCoach ? 'Post the first assignment above.' : 'No assignments yet.'}</p>}
        {assignments.map((a) => {
          const done = doneBy(a.id);
          const mine = done.includes(myId);
          const overdue = a.due_date && !mine && a.due_date < new Date().toISOString().slice(0, 10);
          return (
            <div key={a.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className={`font-semibold ${mine ? 'text-zinc-400 line-through' : 'text-white'}`}>{a.title}</div>
                  {a.details && <p className="mt-0.5 text-sm text-zinc-400 whitespace-pre-wrap">{a.details}</p>}
                  <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-zinc-500">
                    {a.due_date && (
                      <span className={overdue ? 'text-red-400' : ''}>
                        Due {new Date(`${a.due_date}T00:00:00`).toLocaleDateString('en-IE', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </span>
                    )}
                    <span>
                      {done.length}/{players.length || roster.length} done
                    </span>
                    {a.link && (
                      <Link href={a.link} className="text-cyan-400 underline">
                        {LINK_OPTIONS.find((o) => o.value === a.link)?.label || 'Open'}
                      </Link>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={mine ? 'secondary' : 'primary'}
                    isLoading={busy === `t-${a.id}`}
                    onClick={() =>
                      run(`t-${a.id}`, () =>
                        mine
                          ? db().from('team_assignment_completions').delete().eq('assignment_id', a.id).eq('user_id', myId)
                          : db().from('team_assignment_completions').insert({ assignment_id: a.id, user_id: myId })
                      )
                    }
                  >
                    {mine ? 'Undo' : <><Check className="h-4 w-4 mr-1" /> Done</>}
                  </Button>
                  {isCoach && (
                    <button
                      type="button"
                      aria-label={`Delete ${a.title}`}
                      className="text-zinc-600 hover:text-red-400"
                      onClick={() => window.confirm('Delete this assignment?') && void run(`d-${a.id}`, () => db().from('team_assignments').delete().eq('id', a.id))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              {isCoach && done.length > 0 && (
                <p className="mt-2 text-[11px] text-emerald-400/80">
                  ✓ {done.map((uid) => roster.find((r) => r.user_id === uid)?.display_name || 'Former member').join(', ')}
                </p>
              )}
            </div>
          );
        })}
      </section>

      {/* Roster */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-white">Roster</h2>
          <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="Sort roster" className="rounded-lg bg-zinc-900 border border-zinc-800 px-2 py-1 text-xs text-white">
            <option value="week">Most active this week</option>
            <option value="ppg">Points per game</option>
            <option value="name">Name</option>
          </select>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900 text-[11px] uppercase text-zinc-500">
              <tr>
                <th className="px-3 py-2 text-left">Player</th>
                <th className="px-2 py-2 text-right" title="Sessions + workouts in the last 7 days">7d</th>
                <th className="px-2 py-2 text-right">Min</th>
                <th className="px-2 py-2 text-right" title="Shots made/attempted in training, last 7 days">Shots</th>
                <th className="px-2 py-2 text-right">PPG</th>
                <th className="px-2 py-2 text-right">RPG</th>
                <th className="px-2 py-2 text-right">APG</th>
                <th className="px-2 py-2 text-right">Last</th>
                {isCoach && <th className="px-2 py-2" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {sorted.map((r) => (
                <tr key={r.user_id} className={r.user_id === myId ? 'bg-orange-600/5' : ''}>
                  <td className="px-3 py-2">
                    <div className="font-semibold text-white whitespace-nowrap">
                      {r.display_name}
                      {r.role === 'coach' && <span className="ml-1.5 text-[10px] font-bold text-cyan-400">COACH</span>}
                    </div>
                    <div className="text-[11px] text-zinc-500 flex items-center gap-1">
                      {r.player_position || '—'}
                      {r.streak > 0 && (
                        <span className="text-orange-400 flex items-center">
                          <Flame className="h-3 w-3" />
                          {r.streak}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-2 text-right text-white">{r.sessions_7d + r.workouts_7d}</td>
                  <td className="px-2 py-2 text-right text-zinc-300">{r.minutes_7d}</td>
                  <td className="px-2 py-2 text-right text-zinc-300 whitespace-nowrap">{r.attempts_7d ? `${r.makes_7d}/${r.attempts_7d}` : '–'}</td>
                  <td className="px-2 py-2 text-right text-zinc-300">{r.games ? r.ppg : '–'}</td>
                  <td className="px-2 py-2 text-right text-zinc-300">{r.games ? r.rpg : '–'}</td>
                  <td className="px-2 py-2 text-right text-zinc-300">{r.games ? r.apg : '–'}</td>
                  <td className="px-2 py-2 text-right text-xs text-zinc-500 whitespace-nowrap">{lastSeen(r.last_active)}</td>
                  {isCoach && (
                    <td className="px-2 py-2 text-right whitespace-nowrap">
                      {r.user_id !== myId && (
                        <>
                          <button
                            type="button"
                            title={r.role === 'coach' ? 'Make player' : 'Make coach'}
                            aria-label={r.role === 'coach' ? `Make ${r.display_name} a player` : `Make ${r.display_name} a coach`}
                            className="text-zinc-500 hover:text-cyan-400 mr-2"
                            onClick={() =>
                              void run(`r-${r.user_id}`, () =>
                                db().rpc('set_team_role', { p_team: teamId, p_user: r.user_id, p_role: r.role === 'coach' ? 'player' : 'coach' })
                              )
                            }
                          >
                            <UserCog className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            aria-label={`Remove ${r.display_name}`}
                            className="text-zinc-500 hover:text-red-400"
                            onClick={() =>
                              window.confirm(`Remove ${r.display_name} from the team?`) &&
                              void run(`x-${r.user_id}`, () => db().from('team_members').delete().eq('team_id', teamId).eq('user_id', r.user_id))
                            }
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-zinc-500">
          Training numbers are the last 7 days; game averages cover the last 12 months of games each player logged in HoopIQ.
        </p>
      </section>

      <div className="flex flex-wrap gap-4 text-xs">
        <button
          type="button"
          className="text-zinc-500 underline"
          onClick={async () => {
            if (isCoach && roster.filter((r) => r.role === 'coach').length === 1) {
              setMessage({ tone: 'error', text: "You're the only coach. Make another member a coach first, or delete the team." });
              return;
            }
            if (!window.confirm(`Leave ${teamName}?`)) return;
            const ok = await run('leave', () => db().from('team_members').delete().eq('team_id', teamId).eq('user_id', myId));
            if (ok) router.push('/teams');
          }}
        >
          Leave team
        </button>
        {isCoach && (
          <button
            type="button"
            className="text-red-400/80 underline"
            onClick={async () => {
              if (!window.confirm(`Delete ${teamName} for everyone? Assignments will be lost.`)) return;
              const ok = await run('delete', () => db().rpc('delete_team', { p_team: teamId }));
              if (ok) router.push('/teams');
            }}
          >
            Delete team
          </button>
        )}
      </div>
    </div>
  );
}
