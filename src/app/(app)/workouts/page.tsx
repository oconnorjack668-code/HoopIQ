// src/app/(app)/workouts/page.tsx
import React from 'react';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { Plus, Dumbbell } from 'lucide-react';

export const metadata = {
  title: 'Workouts - HoopIQ',
};

export default async function WorkoutsPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: workouts } = await supabase
    .from('workouts')
    .select('*')
    .eq('user_id', user.id)
    .order('workout_date', { ascending: false })
    .limit(10)
    .returns<Array<{
      id: string;
      workout_type: string;
      workout_date: string;
      duration_minutes: number;
      rpe: number;
    }>>();

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg">
              <Dumbbell className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white">Gym Workouts</h1>
              <p className="text-sm text-zinc-400 mt-1">Strength, plyometrics, mobility, and testing</p>
            </div>
          </div>
          <Link href="/workouts/new">
            <Button variant="primary" size="lg" className="gap-2">
              <Plus className="h-4 w-4" /> New Workout
            </Button>
          </Link>
        </div>

        {workouts && workouts.length > 0 ? (
          <div className="space-y-3">
            {workouts.map((w) => (
              <Link key={w.id} href={`/workouts/${w.id}`} className="block">
                <Card className="border-zinc-800 bg-zinc-900/70 hover:bg-zinc-900/90 transition-all cursor-pointer">
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-white capitalize">{w.workout_type.replace(/_/g, ' ')}</h3>
                    <p className="text-xs text-zinc-400 mt-1">
                      {new Date(w.workout_date).toLocaleDateString()} · {w.duration_minutes} min · RPE {w.rpe}/10
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardContent className="p-12 text-center">
              <Dumbbell className="h-12 w-12 text-zinc-700 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-zinc-300 mb-1">No workouts yet</h3>
              <p className="text-sm text-zinc-400 mb-6">Start logging your gym sessions.</p>
              <Link href="/workouts/new">
                <Button variant="primary" size="lg">
                  New Workout
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
