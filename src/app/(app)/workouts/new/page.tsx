// src/app/(app)/workouts/new/page.tsx
// @ts-nocheck
'use client';

import React, { useEffect, useState } from 'react';
import { asMeasurementSystem, inputWeightToKg, weightUnitLabel, type MeasurementSystem } from '@/lib/units';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { workoutSchema, workoutSetSchema } from '@/lib/validation';

interface WorkoutSet {
  exerciseName: string;
  setNumber: number;
  reps: number | '';
  weight_kg: number | '';
  duration_seconds: number | '';
  distance_meters: number | '';
  rpe: number | '';
  isPersonalRecord: boolean;
}

export default function NewWorkoutPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Weights are typed in the player's unit and stored in kg
  const [units, setUnits] = useState<MeasurementSystem>('imperial');
  useEffect(() => {
    (async () => {
      const supabase = createClient() as any;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('profiles').select('measurement_system').eq('id', user.id).maybeSingle();
      setUnits(asMeasurementSystem(data?.measurement_system));
    })();
  }, []);

  const [workoutDate, setWorkoutDate] = useState(new Date().toISOString().split('T')[0]);
  const [workoutType, setWorkoutType] = useState('strength');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [rpe, setRpe] = useState(6);
  const [notes, setNotes] = useState('');
  const [sets, setSets] = useState<WorkoutSet[]>([
    { exerciseName: '', setNumber: 1, reps: '', weight_kg: '', duration_seconds: '', distance_meters: '', rpe: '', isPersonalRecord: false },
  ]);

  function addSet() {
    setSets([...sets, {
      exerciseName: '',
      setNumber: sets.length + 1,
      reps: '',
      weight_kg: '',
      duration_seconds: '',
      distance_meters: '',
      rpe: '',
      isPersonalRecord: false,
    }]);
  }

  function removeSet(index: number) {
    setSets(sets.filter((_, i) => i !== index));
  }

  function updateSet(index: number, field: string, value: any) {
    const newSets = [...sets];
    (newSets[index] as any)[field] = value;
    setSets(newSets);
  }

  // @ts-ignore
  async function handleSave() {
    setError(null);
    setIsLoading(true);

    // Validate everything before saving anything
    const workoutResult = workoutSchema.safeParse({
      workoutDate,
      workoutType,
      durationMinutes: Number(durationMinutes),
      rpe: Number(rpe),
      notes: notes || null,
    });
    if (!workoutResult.success) {
      setError(workoutResult.error.issues[0].message);
      setIsLoading(false);
      return;
    }

    const toNumber = (v: number | '') => (v === '' ? null : Number(v));
    const setsToSave = sets.filter((s) => s.exerciseName.trim());
    for (const [idx, set] of setsToSave.entries()) {
      const setResult = workoutSetSchema.safeParse({
        exerciseName: set.exerciseName.trim(),
        setNumber: idx + 1,
        reps: toNumber(set.reps),
        weightKg: toNumber(set.weight_kg),
        durationSeconds: toNumber(set.duration_seconds),
        distanceMeters: toNumber(set.distance_meters),
        rpe: toNumber(set.rpe),
        isPersonalRecord: set.isPersonalRecord,
      });
      if (!setResult.success) {
        setError(`${set.exerciseName.trim()} (set ${idx + 1}): ${setResult.error.issues[0].message}`);
        setIsLoading(false);
        return;
      }
    }

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      const workoutResponse = await supabase
        .from('workouts')
        .insert({
          user_id: user.id,
          workout_date: workoutDate,
          workout_type: workoutType,
          duration_minutes: Number(durationMinutes),
          rpe: Number(rpe),
          notes: notes || null,
        })
        .select()
        .single();

      const workout = workoutResponse.data as any;
      const wError = workoutResponse.error;

      if (wError || !workout) {
        setError('Failed to create workout.');
        setIsLoading(false);
        return;
      }

      const { error: setsError } = await supabase.from('workout_sets').insert(
        setsToSave.map((set, idx) => ({
          workout_id: workout.id,
          user_id: user.id,
          exercise_name: set.exerciseName.trim(),
          set_number: idx + 1,
          reps: toNumber(set.reps),
          weight_kg: set.weight_kg === '' ? null : inputWeightToKg(Number(set.weight_kg), units),
          duration_seconds: toNumber(set.duration_seconds),
          distance_meters: toNumber(set.distance_meters),
          rpe: toNumber(set.rpe),
          is_personal_record: set.isPersonalRecord,
        }))
      );

      if (setsError) {
        // Deleting the workout cascades to any sets that were saved
        await supabase.from('workouts').delete().eq('id', workout.id);
        setError('Could not save your sets. Nothing was saved, please try again.');
        setIsLoading(false);
        return;
      }

      router.push('/workouts');
      router.refresh();
    } catch {
      setError('An unexpected error occurred.');
      setIsLoading(false);
    }
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-black tracking-tight text-white">New Workout</h1>
          <Link href="/workouts">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        {error && <Alert variant="error" title="Error">{error}</Alert>}

        <div className="space-y-6">
          <Card className="border-zinc-800 bg-zinc-900/70">
            <CardHeader>
              <CardTitle>Workout Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Date"
                  type="date"
                  value={workoutDate}
                  onChange={(e) => setWorkoutDate(e.target.value)}
                />
                <Select
                  label="Workout Type"
                  value={workoutType}
                  onChange={(e) => setWorkoutType(e.target.value)}
                  options={[
                    { value: 'strength', label: 'Strength' },
                    { value: 'power_plyos', label: 'Power & Plyometrics' },
                    { value: 'mobility', label: 'Mobility' },
                    { value: 'recovery', label: 'Recovery' },
                    { value: 'conditioning', label: 'Conditioning' },
                    { value: 'testing', label: 'Testing' },
                    { value: 'mixed', label: 'Mixed' },
                  ]}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Duration (min)"
                  type="number"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                />
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5">
                    RPE (Perceived Exertion)
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={rpe}
                    onChange={(e) => setRpe(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-xs text-zinc-400 mt-1 text-center">{rpe}/10</div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="How did the workout go?"
                  className="w-full h-16 rounded-xl border border-zinc-700/80 bg-zinc-900/90 px-3.5 py-2 text-sm text-zinc-100 placeholder:text-zinc-500"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-zinc-800 bg-zinc-900/70">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Exercises</CardTitle>
                <Button variant="secondary" size="sm" onClick={addSet} className="gap-1">
                  <Plus className="h-3.5 w-3.5" /> Add Set
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {sets.map((set, idx) => (
                <div key={idx} className="p-4 rounded-lg border border-zinc-800 bg-zinc-950/50 space-y-3">
                  <div className="flex gap-2">
                    <Input
                      label="Exercise"
                      placeholder="e.g., Barbell Back Squat"
                      value={set.exerciseName}
                      onChange={(e) => updateSet(idx, 'exerciseName', e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeSet(idx)}
                      className="text-red-400 hover:bg-red-950/20 self-end"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    <Input
                      label="Reps"
                      type="number"
                      placeholder="Reps"
                      value={set.reps}
                      onChange={(e) => updateSet(idx, 'reps', e.target.value)}
                    />
                    <Input
                      label={`Weight (${weightUnitLabel(units)})`}
                      type="number"
                      placeholder="Weight"
                      value={set.weight_kg}
                      onChange={(e) => updateSet(idx, 'weight_kg', e.target.value)}
                    />
                    <Input
                      label="Seconds"
                      type="number"
                      placeholder="Duration"
                      value={set.duration_seconds}
                      onChange={(e) => updateSet(idx, 'duration_seconds', e.target.value)}
                    />
                    <Input
                      label="Distance (m)"
                      type="number"
                      placeholder="Distance"
                      value={set.distance_meters}
                      onChange={(e) => updateSet(idx, 'distance_meters', e.target.value)}
                    />
                    <Input
                      label="RPE"
                      type="number"
                      placeholder="1-10"
                      value={set.rpe}
                      onChange={(e) => updateSet(idx, 'rpe', e.target.value)}
                    />
                  </div>
                  <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={set.isPersonalRecord}
                      onChange={(e) => updateSet(idx, 'isPersonalRecord', e.target.checked)}
                      className="rounded"
                    />
                    Personal record
                  </label>
                </div>
              ))}
            </CardContent>
            <CardFooter className="flex justify-between pt-4">
              <Button variant="secondary" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                isLoading={isLoading}
                disabled={sets.every((s) => !s.exerciseName.trim())}
              >
                Save Workout
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
