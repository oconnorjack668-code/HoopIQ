// src/app/(app)/teams/[id]/page.tsx
import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { TeamClient, type Assignment, type RosterRow } from './TeamClient';
import { ArrowLeft, Shield } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Team - HoopIQ' };

export default async function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const supabase = (await createClient()) as any;
  const { data: team } = await supabase.from('teams').select('id, name, join_code').eq('id', id).maybeSingle();
  if (!team) notFound(); // not a member (RLS) or no such team

  const [roster, assignments, completions] = await Promise.all([
    supabase.rpc('team_roster', { p_team: id }),
    supabase
      .from('team_assignments')
      .select('id, title, details, link, due_date, created_at')
      .eq('team_id', id)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase.from('team_assignment_completions').select('assignment_id, user_id, team_assignments!inner(team_id)').eq('team_assignments.team_id', id),
  ]);
  const rows = (roster.data || []) as RosterRow[];
  const me = rows.find((r) => r.user_id === user.id);

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
        <Link href="/teams" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200">
          <ArrowLeft className="h-4 w-4" /> Teams
        </Link>
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white">{team.name}</h1>
            <p className="text-sm text-zinc-400">
              {rows.length} {rows.length === 1 ? 'member' : 'members'} · you&apos;re {me?.role === 'coach' ? 'a coach' : 'a player'}
            </p>
          </div>
        </div>
        <TeamClient
          teamId={team.id}
          teamName={team.name}
          joinCode={team.join_code}
          myId={user.id}
          isCoach={me?.role === 'coach'}
          roster={rows}
          assignments={(assignments.data || []) as Assignment[]}
          completions={((completions.data || []) as Array<{ assignment_id: string; user_id: string }>).map((c) => ({
            assignment_id: c.assignment_id,
            user_id: c.user_id,
          }))}
        />
      </div>
    </div>
  );
}
