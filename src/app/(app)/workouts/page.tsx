// src/app/(app)/workouts/page.tsx
import React from 'react';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { Plus, Dumbbell, BookOpen, Award, ListChecks, ChevronRight } from 'lucide-react';
import { DeleteRoutineButton } from './DeleteRoutineButton';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Workouts - HoopIQ',
};

export default async function WorkoutsPage() {
  const user = await requireUser();
  const supabase = (await createClient()) as any;

  const [{ data: workouts }, { data: routines }] = (await Promise.all([
    supabase
      .from('workouts')
      .select('id, workout_type, workout_date, duration_minutes, rpe, workout_sets(count)')
      .eq('user_id', user.id)
      .order('workout_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(15),
    supabase
      .from('workout_routines')
      .select('id, name, routine_exercises(exercise_name, display_order)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
  ])) as [
    {
      data: Array<{
        id: string;
        workout_type: string;
        workout_date: string;
        duration_minutes: number;
        rpe: number;
        workout_sets: Array<{ count: number }>;
      }> | null;
    },
    { data: Array<{ id: string; name: string; routine_exercises: Array<{ exercise_name: string; display_order: number }> }> | null },
  ];

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8 max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg">
            <Dumbbell className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white">Gym</h1>
            <p className="text-sm text-zinc-400 mt-1">Strength, explosiveness, mobility and injury prevention</p>
          </div>
        </div>

        <Link href="/workouts/new" className="block mb-4">
          <Button variant="primary" size="lg" className="w-full gap-2">
            <Plus className="h-4 w-4" /> Start workout
          </Button>
        </Link>

        <div className="grid grid-cols-2 gap-3 mb-8">
          <Link href="/workouts/exercises">
            <Card className="border-zinc-800 bg-zinc-900/70 hover:bg-zinc-900 transition-colors h-full">
              <CardContent className="p-4 flex items-center gap-3">
                <BookOpen className="h-5 w-5 text-emerald-400" />
                <div>
                  <div className="text-sm font-semibold text-white">Exercise library</div>
                  <div className="text-xs text-zinc-500">By muscle group</div>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/workouts/tests">
            <Card className="border-zinc-800 bg-zinc-900/70 hover:bg-zinc-900 transition-colors h-full">
              <CardContent className="p-4 flex items-center gap-3">
                <Award className="h-5 w-5 text-orange-400" />
                <div>
                  <div className="text-sm font-semibold text-white">Performance tests</div>
                  <div className="text-xs text-zinc-500">Vertical, sprint, agility</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Routines */}
        <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-3">
          <ListChecks className="h-5 w-5 text-emerald-400" /> My routines
        </h2>
        {routines && routines.length > 0 ? (
          <div className="space-y-2 mb-8">
            {routines.map((r) => {
              const names = [...r.routine_exercises]
                .sort((a, b) => a.display_order - b.display_order)
                .map((x) => x.exercise_name);
              return (
                <Card key={r.id} className="border-zinc-800 bg-zinc-900/70">
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-white">{r.name}</div>
                      <div className="text-xs text-zinc-500 truncate">{names.join(', ') || 'No exercises'}</div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <DeleteRoutineButton routineId={r.id} name={r.name} />
                      <Link href={`/workouts/new?routine=${r.id}`}>
                        <Button variant="secondary" size="sm">Start</Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-zinc-500 mb-8">
            Save any workout as a routine when you finish it, then start it again here with one tap.
          </p>
        )}

        {/* History */}
        <h2 className="text-lg font-bold text-white mb-3">History</h2>
        {workouts && workouts.length > 0 ? (
          <div className="space-y-2">
            {workouts.map((w) => (
              <Link key={w.id} href={`/workouts/${w.id}`} className="block">
                <Card className="border-zinc-800 bg-zinc-900/70 hover:bg-zinc-900/90 transition-all">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-white capitalize">{w.workout_type.replace(/_/g, ' ')}</h3>
                      <p className="text-xs text-zinc-400 mt-1">
                        {new Date(`${w.workout_date}T00:00:00`).toLocaleDateString()} · {w.duration_minutes} min · RPE {w.rpe}/10
                        {w.workout_sets?.[0]?.count ? ` · ${w.workout_sets[0].count} sets` : ''}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-zinc-600" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-500">No workouts yet. Tap &ldquo;Start workout&rdquo; to log your first one.</p>
        )}
      </div>
    </div>
  );
}
