// src/app/(app)/workouts/[id]/page.tsx
import React from 'react';
import { requireUser, getCurrentProfile } from '@/lib/auth';
import { asMeasurementSystem, displayWeight, weightUnitLabel } from '@/lib/units';
import { createClient } from '@/lib/supabase/server';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { ArrowLeft, Dumbbell, Award, TrendingUp } from 'lucide-react';
import { notFound } from 'next/navigation';

export const metadata = {
  title: 'Workout Details - HoopIQ',
};

export default async function WorkoutDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const supabase = await createClient();
  const units = asMeasurementSystem((await getCurrentProfile())?.measurement_system);

  const { data: workout } = await supabase
    .from('workouts')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single() as unknown as {
      data: {
        id: string;
        workout_type: string;
        workout_date: string;
        duration_minutes: number;
        rpe: number;
        notes: string | null;
      } | null;
    };

  if (!workout) {
    notFound();
  }

  const { data: sets } = await supabase
    .from('workout_sets')
    .select('*')
    .eq('workout_id', id)
    .order('set_number', { ascending: true })
    .returns<Array<{
      id: string;
      exercise_name: string;
      set_number: number;
      reps: number | null;
      weight_kg: number | null;
      duration_seconds: number | null;
      distance_meters: number | null;
      rpe: number | null;
      is_personal_record: boolean;
      notes: string | null;
    }>>();

  const workoutTypeLabel = {
    strength: 'Strength',
    power_plyos: 'Power & Plyometrics',
    mobility: 'Mobility',
    recovery: 'Recovery',
    conditioning: 'Conditioning',
    testing: 'Testing',
    mixed: 'Mixed',
  }[workout.workout_type] || workout.workout_type;

  const prCount = sets?.filter((s) => s.is_personal_record).length || 0;

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-1">
            <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-2">
              <Dumbbell className="h-8 w-8 text-emerald-400" />
              {workoutTypeLabel}
            </h1>
            <p className="text-sm text-zinc-400">
              {new Date(workout.workout_date).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          </div>
          <Link href="/workouts">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-zinc-800 bg-zinc-900/70">
            <CardContent className="p-4">
              <div className="text-xs text-zinc-400 font-semibold uppercase mb-1">Duration</div>
              <div className="text-2xl font-bold text-white">{workout.duration_minutes}m</div>
            </CardContent>
          </Card>

          <Card className="border-zinc-800 bg-zinc-900/70">
            <CardContent className="p-4">
              <div className="text-xs text-zinc-400 font-semibold uppercase mb-1">RPE</div>
              <div className="text-2xl font-bold text-orange-400">{workout.rpe}/10</div>
            </CardContent>
          </Card>

          <Card className="border-zinc-800 bg-zinc-900/70">
            <CardContent className="p-4">
              <div className="text-xs text-zinc-400 font-semibold uppercase mb-1">Exercises</div>
              <div className="text-2xl font-bold text-white">
                {sets?.reduce((acc, s, i, arr) => {
                  if (i === 0 || arr[i - 1].exercise_name !== s.exercise_name) {
                    return acc + 1;
                  }
                  return acc;
                }, 0) || 0}
              </div>
            </CardContent>
          </Card>

          <Card className="border-zinc-800 bg-zinc-900/70">
            <CardContent className="p-4">
              <div className="text-xs text-zinc-400 font-semibold uppercase mb-1">PRs</div>
              <div className="flex items-center gap-1">
                <Award className="h-5 w-5 text-amber-400" />
                <span className="text-2xl font-bold text-amber-400">{prCount}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sets Detail */}
        <Card className="border-zinc-800 bg-zinc-900/70 mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-400" />
              Exercises & Sets
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sets && sets.length > 0 ? (
              <div className="space-y-4">
                {sets.map((set, idx) => (
                  <div
                    key={set.id}
                    className="p-4 rounded-lg border border-zinc-800/60 bg-zinc-950/50 hover:border-emerald-500/30 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-bold text-white">{set.exercise_name}</h3>
                        <p className="text-xs text-zinc-500">Set {set.set_number}</p>
                      </div>
                      {set.is_personal_record && (
                        <Badge variant="orange" className="gap-1">
                          <Award className="h-3 w-3" />
                          PR
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                      {set.reps !== null && (
                        <div className="p-2 rounded bg-zinc-900/70 border border-zinc-800/40">
                          <div className="text-xs text-zinc-400 font-semibold">Reps</div>
                          <div className="font-bold text-white mt-0.5">{set.reps}</div>
                        </div>
                      )}
                      {set.weight_kg !== null && (
                        <div className="p-2 rounded bg-zinc-900/70 border border-zinc-800/40">
                          <div className="text-xs text-zinc-400 font-semibold">Weight</div>
                          <div className="font-bold text-white mt-0.5">
                            {displayWeight(set.weight_kg, units)} {weightUnitLabel(units)}
                          </div>
                        </div>
                      )}
                      {set.duration_seconds !== null && (
                        <div className="p-2 rounded bg-zinc-900/70 border border-zinc-800/40">
                          <div className="text-xs text-zinc-400 font-semibold">Duration</div>
                          <div className="font-bold text-white mt-0.5">{set.duration_seconds}s</div>
                        </div>
                      )}
                      {set.distance_meters !== null && (
                        <div className="p-2 rounded bg-zinc-900/70 border border-zinc-800/40">
                          <div className="text-xs text-zinc-400 font-semibold">Distance</div>
                          <div className="font-bold text-white mt-0.5">{set.distance_meters} m</div>
                        </div>
                      )}
                      {set.rpe !== null && (
                        <div className="p-2 rounded bg-zinc-900/70 border border-zinc-800/40">
                          <div className="text-xs text-zinc-400 font-semibold">RPE</div>
                          <div className="font-bold text-orange-400 mt-0.5">{set.rpe}/10</div>
                        </div>
                      )}
                    </div>

                    {set.notes && (
                      <div className="mt-2 pt-2 border-t border-zinc-800/40">
                        <p className="text-xs text-zinc-400 italic">{set.notes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-zinc-400">No sets logged for this workout</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Workout Notes */}
        {workout.notes && (
          <Card className="border-zinc-800 bg-zinc-900/70">
            <CardHeader>
              <CardTitle className="text-base">Workout Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-300 whitespace-pre-line">{workout.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
