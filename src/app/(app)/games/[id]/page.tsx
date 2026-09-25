// src/app/(app)/games/[id]/page.tsx
import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { seasonAverages, type GameRow } from '@/lib/games';
import { ShareCardButton } from '@/components/ShareCardButton';
import { DeleteGameButton } from './DeleteGameButton';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Game - HoopIQ' };

export default async function GamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const supabase = (await createClient()) as any;
  const { data } = await supabase.from('games').select('*').eq('id', id).eq('user_id', user.id).maybeSingle();
  if (!data) notFound();
  const g = data as GameRow;
  const s = seasonAverages([g]);
  const rows: Array<[string, string]> = [
    ['Field goals', `${g.fgm2 + g.fgm3}/${g.fga2 + g.fga3}${s.fgPct != null ? ` (${s.fgPct}%)` : ''}`],
    ['Two-pointers', `${g.fgm2}/${g.fga2}`],
    ['Three-pointers', `${g.fgm3}/${g.fga3}${s.threePct != null ? ` (${s.threePct}%)` : ''}`],
    ['Free throws', `${g.ftm}/${g.fta}${s.ftPct != null ? ` (${s.ftPct}%)` : ''}`],
    ['Rebounds', `${g.oreb + g.dreb} (${g.oreb} off · ${g.dreb} def)`],
    ['Assists', `${g.ast}`],
    ['Steals', `${g.stl}`],
    ['Blocks', `${g.blk}`],
    ['Turnovers', `${g.tov}`],
    ['Fouls', `${g.pf}`],
  ];
  if (g.minutes != null) rows.unshift(['Minutes', `${g.minutes}`]);

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-5">
        <Link href="/games" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200">
          <ArrowLeft className="h-4 w-4" /> Games
        </Link>
        <div>
          <h1 className="text-3xl font-black text-white">{g.opponent ? `vs ${g.opponent}` : 'Game'}</h1>
          <p className="text-sm text-zinc-400">
            {new Date(`${g.game_date}T00:00:00`).toLocaleDateString('en-IE', { weekday: 'long', day: 'numeric', month: 'long' })} · {g.game_type}
            {g.result && ` · ${g.result === 'win' ? 'Win' : g.result === 'loss' ? 'Loss' : 'Draw'}`}
            {g.team_score != null && g.opponent_score != null && ` ${g.team_score}-${g.opponent_score}`}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl bg-orange-600/15 border border-orange-600/40 p-4">
            <div className="text-4xl font-black text-orange-400">{g.points}</div>
            <div className="text-xs text-zinc-400">points</div>
          </div>
          <div className="rounded-2xl bg-zinc-900/70 border border-zinc-800 p-4">
            <div className="text-4xl font-black text-white">{g.oreb + g.dreb}</div>
            <div className="text-xs text-zinc-400">rebounds</div>
          </div>
          <div className="rounded-2xl bg-zinc-900/70 border border-zinc-800 p-4">
            <div className="text-4xl font-black text-white">{g.ast}</div>
            <div className="text-xs text-zinc-400">assists</div>
          </div>
        </div>

        <ShareCardButton path={`/api/share/game?id=${g.id}`} text={`${g.points} pts, ${g.oreb + g.dreb} reb, ${g.ast} ast 🏀 #HoopIQ`} label="Share stat line" />

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 divide-y divide-zinc-800">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between px-4 py-2.5 text-sm">
              <span className="text-zinc-400">{label}</span>
              <span className="font-semibold text-white">{value}</span>
            </div>
          ))}
        </div>

        {g.notes && <p className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 text-sm text-zinc-300 whitespace-pre-wrap">{g.notes}</p>}

        <DeleteGameButton id={g.id} />
      </div>
    </div>
  );
}
