// src/app/(app)/programs/[slug]/page.tsx
import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { GOAL_LABELS, getActiveProgram, sortDays, type Program, type ProgramDay } from '@/lib/programs';
import { EnrollButton } from './EnrollButton';
import { ArrowLeft, CheckCircle2, Circle, Clock } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Program - HoopIQ' };

export default async function ProgramPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  const { data: program } = (await (supabase as any)
    .from('training_programs')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()) as { data: Program | null };
  if (!program) notFound();

  const [{ data: dayRows }, active] = await Promise.all([
    (supabase as any).from('program_days').select('*').eq('program_id', program.id),
    getActiveProgram(supabase as any, user.id),
  ]);
  const days = sortDays((dayRows || []) as ProgramDay[]);
  const isActive = active?.program.id === program.id;
  const completed = isActive ? active!.completedIds : new Set<string>();

  const weeks = Array.from({ length: program.weeks }, (_, i) => days.filter((d) => d.week === i + 1));

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8 max-w-3xl mx-auto">
        <Link href="/programs" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 mb-4">
          <ArrowLeft className="h-4 w-4" /> Programs
        </Link>
        <h1 className="text-3xl font-black tracking-tight text-white">{program.name}</h1>
        <p className="text-sm text-zinc-400 mt-1 capitalize">
          {GOAL_LABELS[program.goal]} · {program.level} · {program.position === 'any' ? 'all positions' : `${program.position}s`} ·{' '}
          {program.season.replace('_', '-')}
        </p>
        <p className="text-zinc-300 mt-4">{program.description}</p>
        <p className="text-sm text-zinc-500 mt-2">
          {program.weeks} weeks · {program.sessions_per_week} sessions a week · {days.length} sessions total
        </p>

        <div className="my-6">
          <EnrollButton
            programId={program.id}
            programName={program.name}
            isActive={isActive}
            hasOtherActive={!!active && !isActive}
            otherName={active && !isActive ? active.program.name : undefined}
            nextHref={isActive && active!.next ? `/programs/${program.slug}/day/${active!.next.id}` : undefined}
          />
        </div>

        <div className="space-y-4">
          {weeks.map((weekDays, i) => (
            <div key={i}>
              <h2 className="text-sm font-bold uppercase text-zinc-400 mb-2">Week {i + 1}</h2>
              <div className="space-y-2">
                {weekDays.map((d) => (
                  <Link
                    key={d.id}
                    href={`/programs/${program.slug}/day/${d.id}`}
                    className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/70 px-4 py-3 hover:bg-zinc-900"
                  >
                    {completed.has(d.id) ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                    ) : (
                      <Circle className="h-5 w-5 text-zinc-600 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-white">
                        Session {d.day}: {d.title}
                      </div>
                      <div className="text-xs text-zinc-500 truncate">{d.focus}</div>
                    </div>
                    <span className="flex items-center gap-1 text-xs text-zinc-500">
                      <Clock className="h-3 w-3" /> {d.estimated_minutes}m
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
