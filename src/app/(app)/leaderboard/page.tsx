// src/app/(app)/leaderboard/page.tsx
// Season leaderboard (standings stored by the database, refreshed at most every 10 minutes,
// counted on each player's own calendar — migration 00024).
// Scoring: +10 per training day (hoops session or workout, max 1 per day), +10 per study
// topic quiz passed at 80%+, plus challenge points.
import React from 'react';
import Link from 'next/link';
import { requireUser, getCurrentProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { countryName } from '@/lib/regions';
import { Trophy, Flame, Star, Target, Users, MapPin } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Leaderboard - HoopIQ' };

type Scope = 'everyone' | 'country' | 'region' | 'friends' | 'team';
const AGE_GROUPS = [
  { id: 'all', label: 'All ages' },
  { id: 'u14', label: 'U14' },
  { id: '14-17', label: '14–17' },
  { id: '18+', label: '18+' },
] as const;

interface Standing {
  user_id: string;
  player_name: string;
  points: number;
  rank: number;
  sessions_completed: number;
  training_days: number;
  current_streak: number;
  is_me: boolean;
  total: number;
}

function href(scope: Scope, age: string, team?: string | null) {
  const q = new URLSearchParams({ scope });
  if (age !== 'all') q.set('age', age);
  if (scope === 'team' && team) q.set('team', team);
  return `/leaderboard?${q.toString()}`;
}

export default async function LeaderboardPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireUser();
  const params = await searchParams;
  const [profile, supabase] = await Promise.all([getCurrentProfile(), createClient()]);
  const db = supabase as any;

  const age = AGE_GROUPS.some((g) => g.id === params.age) ? (params.age as string) : 'all';
  let scope: Scope = (['everyone', 'country', 'region', 'friends', 'team'] as const).includes(params.scope as Scope)
    ? (params.scope as Scope)
    : 'everyone';

  const [{ data: season }, { data: memberships }, { data: challenges }, { data: myChallenges }] = await Promise.all([
    db.from('leaderboard_seasons').select('id, name').eq('is_active', true).maybeSingle(),
    db.from('team_members').select('teams(id, name)').eq('user_id', profile?.id ?? ''),
    db.from('challenges').select('id, title, description, points, end_date').eq('is_active', true).limit(20),
    db.from('challenge_completions').select('challenge_id').eq('user_id', profile?.id ?? ''),
  ]);
  const teams = ((memberships || []) as Array<{ teams: { id: string; name: string } | null }>).map((m) => m.teams).filter(Boolean) as Array<{ id: string; name: string }>;
  const teamId = scope === 'team' ? teams.find((t) => t.id === params.team)?.id || teams[0]?.id || null : null;
  if (scope === 'team' && !teamId) scope = 'everyone';

  const rpc = (s: Scope, limit: number, team: string | null = null) =>
    db.rpc('leaderboard_page', { p_scope: s, p_age: age, p_team: team, p_limit: limit });

  // The main list plus "your rank" in each view, all in parallel
  const [main, meEveryone, meCountry, meRegion, meFriends] = await Promise.all([
    rpc(scope, 100, teamId),
    rpc('everyone', 0),
    profile?.country ? rpc('country', 0) : Promise.resolve({ data: [] }),
    profile?.region ? rpc('region', 0) : Promise.resolve({ data: [] }),
    rpc('friends', 0),
  ]);
  const notReady = !!main.error;
  const standings = ((main.data || []) as Standing[]);
  const me = (res: { data?: unknown }) => ((res.data || []) as Standing[]).find((r) => r.is_me);
  const myRanks = [
    { scope: 'everyone' as Scope, label: 'Everyone', row: me(meEveryone) },
    ...(profile?.country ? [{ scope: 'country' as Scope, label: countryName(profile.country), row: me(meCountry) }] : []),
    ...(profile?.region ? [{ scope: 'region' as Scope, label: profile.region, row: me(meRegion) }] : []),
    { scope: 'friends' as Scope, label: 'Friends', row: me(meFriends) },
  ];

  const tabs: Array<{ scope: Scope; label: string; team?: string }> = [
    { scope: 'everyone', label: 'Everyone' },
    { scope: 'country', label: profile?.country ? countryName(profile.country) : 'Country' },
    { scope: 'region', label: profile?.region || 'County' },
    { scope: 'friends', label: 'Friends' },
    ...teams.map((t) => ({ scope: 'team' as Scope, label: t.name, team: t.id })),
  ];
  const needsLocation = (scope === 'country' && !profile?.country) || (scope === 'region' && !profile?.region);
  const done = new Set(((myChallenges || []) as Array<{ challenge_id: string }>).map((c) => c.challenge_id));
  const others = standings.filter((s) => !s.is_me || s.rank <= 100);
  const meRow = standings.find((s) => s.is_me);

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-amber-600 to-orange-500 flex items-center justify-center shadow-lg">
            <Trophy className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white">Leaderboard</h1>
            <p className="text-sm text-zinc-400">{season?.name || 'Season'} · updates every few minutes</p>
          </div>
        </div>

        {notReady ? (
          <p className="rounded-xl border border-amber-600/40 bg-amber-600/10 p-4 text-sm text-amber-200">
            The new leaderboard isn&apos;t switched on yet. Run migration <code>00024_settings_region_coach.sql</code> in Supabase.
          </p>
        ) : (
          <>
            {/* Your rank in every view */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {myRanks.map((r) => (
                <Link
                  key={r.scope}
                  href={href(r.scope, age)}
                  className={`rounded-2xl border p-3 text-center ${scope === r.scope ? 'border-orange-500 bg-orange-500/10' : 'border-zinc-800 bg-zinc-900/70 hover:bg-zinc-900'}`}
                >
                  <div className="text-2xl font-black text-white">{r.row && r.row.points > 0 ? `#${r.row.rank}` : '–'}</div>
                  <div className="text-[11px] text-zinc-400 truncate">
                    {r.label}
                    {r.row && r.row.total > 0 ? ` · of ${r.row.total}` : ''}
                  </div>
                </Link>
              ))}
            </div>
            {meRow && (
              <p className="text-sm text-zinc-400">
                You: <span className="font-bold text-amber-400">{meRow.points} pts</span> · {meRow.training_days} training days
                {meRow.current_streak > 0 && (
                  <>
                    {' '}
                    · <Flame className="inline h-3.5 w-3.5 text-orange-400" /> {meRow.current_streak}
                  </>
                )}
                {!profile?.is_public && (
                  <>
                    {' '}
                    · <Link href="/settings" className="underline text-cyan-400">you&apos;re hidden from the public board</Link>
                  </>
                )}
              </p>
            )}

            {/* View + age filters */}
            <div className="space-y-2">
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {tabs.map((t) => {
                  const active = t.scope === scope && (t.scope !== 'team' || t.team === teamId);
                  return (
                    <Link
                      key={`${t.scope}-${t.team || ''}`}
                      href={href(t.scope, age, t.team)}
                      className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${active ? 'bg-orange-600 text-white' : 'bg-zinc-800 text-zinc-300'}`}
                    >
                      {t.label}
                    </Link>
                  );
                })}
              </div>
              <div className="flex gap-1.5">
                {AGE_GROUPS.map((g) => (
                  <Link
                    key={g.id}
                    href={href(scope, g.id, teamId)}
                    className={`rounded-full px-3 py-1 text-[11px] font-semibold ${age === g.id ? 'bg-zinc-200 text-zinc-900' : 'bg-zinc-900 text-zinc-400 border border-zinc-800'}`}
                  >
                    {g.label}
                  </Link>
                ))}
              </div>
            </div>

            {needsLocation ? (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 text-center text-sm text-zinc-300">
                <MapPin className="h-6 w-6 text-zinc-500 mx-auto mb-2" />
                Add your {scope === 'country' ? 'country' : 'county'} in{' '}
                <Link href="/settings" className="underline text-cyan-400">
                  Settings → Region
                </Link>{' '}
                to see this leaderboard.
              </div>
            ) : (
              <Card className="border-zinc-800 bg-zinc-900/70">
                <CardContent className="p-0">
                  <div className="divide-y divide-zinc-800">
                    {others.length > 0 ? (
                      others.map((player) => {
                        const medal = player.points > 0 && player.rank <= 3 ? ['🥇', '🥈', '🥉'][player.rank - 1] : null;
                        return (
                          <div
                            key={player.user_id}
                            className={`p-4 flex items-center justify-between gap-3 ${player.is_me ? 'bg-orange-500/10 border-l-2 border-orange-500' : ''}`}
                          >
                            <div className="flex items-center gap-4 min-w-0">
                              <div className="w-8 text-center flex-shrink-0">
                                {medal ? <span className="text-xl">{medal}</span> : <span className="text-sm font-bold text-zinc-500">#{player.rank}</span>}
                              </div>
                              <div className="min-w-0">
                                <Link href={`/players/${player.user_id}`} className="font-semibold text-white hover:underline truncate block">
                                  {player.player_name}
                                  {player.is_me && (
                                    <Badge variant="orange" className="ml-2 text-xs">
                                      You
                                    </Badge>
                                  )}
                                </Link>
                                <div className="text-xs text-zinc-500 flex items-center gap-2 mt-0.5">
                                  <span>{player.training_days} training days</span>
                                  {player.current_streak > 0 && (
                                    <span className="flex items-center gap-1">
                                      · <Flame className="h-3 w-3 text-orange-400" /> {player.current_streak}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="text-2xl font-black text-amber-400">{player.points}</div>
                              <div className="text-xs text-zinc-500">pts</div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-8 text-center text-sm text-zinc-400">
                        {scope === 'friends' ? (
                          <>
                            No friends here yet. <Link href="/friends" className="underline text-cyan-400">Add friends</Link>
                          </>
                        ) : (
                          'Nobody here yet this season. Log a session to get on the board!'
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex flex-wrap gap-2">
              <Link href="/friends" className="inline-flex items-center gap-2 rounded-xl border border-cyan-700/40 bg-cyan-950/30 px-3 py-2 text-sm font-semibold text-cyan-300 hover:bg-cyan-950/50">
                <Users className="h-4 w-4" /> Weekly friends leaderboard
              </Link>
            </div>

            <details className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 text-sm">
              <summary className="cursor-pointer font-semibold text-zinc-200">How points work</summary>
              <ul className="mt-2 space-y-1 text-zinc-300">
                <li>
                  <span className="font-bold text-emerald-400">Training:</span> +10 for each day you log a hoops session or workout (max 1 per day, on
                  your own calendar)
                </li>
                <li>
                  <span className="font-bold text-amber-400">Quiz:</span> +10 for each IQ Study topic quiz passed at 80%+
                </li>
                <li>
                  <span className="font-bold text-purple-400">Challenges:</span> bonus points for weekly challenges
                </li>
              </ul>
              <p className="mt-2 text-xs text-zinc-500">
                Everyone, country and county boards show players who turned on &ldquo;Show me on the public leaderboard&rdquo;. Friends and
                team boards show your friends and teammates. Age groups use your age bracket, which is never shown to anyone.
              </p>
            </details>
          </>
        )}

        {challenges && challenges.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-3">
              <Target className="h-5 w-5 text-purple-400" /> Active challenges
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(challenges as Array<{ id: string; title: string; description: string; points: number }>).map((c) => (
                <div key={c.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-white">{c.title}</h3>
                      <p className="text-xs text-zinc-400 mt-1">{c.description}</p>
                    </div>
                    {done.has(c.id) && (
                      <Badge variant="success" className="text-xs flex-shrink-0">
                        ✓ Done
                      </Badge>
                    )}
                  </div>
                  <div className="mt-3 flex items-center gap-1 text-sm font-black text-amber-400">
                    <Star className="h-4 w-4" /> {c.points}
                  </div>
                </div>
              ))}
            </div>
            <Link href="/achievements" className="mt-2 inline-block text-xs text-cyan-400 underline">
              See your challenge progress
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
