// @ts-nocheck
// src/app/(app)/basketball/new/page.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { sessionSchema, shootingEntrySchema } from '@/lib/validation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { SHOT_ZONES } from '@/lib/stats';

interface DrillEntry {
  drillName: string;
  drillCategory: string;
  durationMinutes: number | '';
  shots: { shotZone: string; makes: number; attempts: number }[];
}

export default function NewBasketballSessionPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'session' | 'drills'>('session');

  // Session-level form
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [sessionType, setSessionType] = useState('shooting');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [intensityRpe, setIntensityRpe] = useState(6);
  const [perceivedQuality, setPerceivedQuality] = useState(3);
  const [notes, setNotes] = useState('');

  // Drill entries
  const [drills, setDrills] = useState<DrillEntry[]>([
    { drillName: '', drillCategory: 'shooting', durationMinutes: '', shots: [] },
  ]);

  function addDrill() {
    setDrills([
      ...drills,
      { drillName: '', drillCategory: 'shooting', durationMinutes: '', shots: [] },
    ]);
  }

  function removeDrill(index: number) {
    setDrills(drills.filter((_, i) => i !== index));
  }

  function addShot(drillIndex: number) {
    const newDrills = [...drills];
    newDrills[drillIndex].shots.push({
      shotZone: 'paint',
      makes: 0,
      attempts: 0,
    });
    setDrills(newDrills);
  }

  function removeShot(drillIndex: number, shotIndex: number) {
    const newDrills = [...drills];
    newDrills[drillIndex].shots = newDrills[drillIndex].shots.filter((_, i) => i !== shotIndex);
    setDrills(newDrills);
  }

  function updateShot(
    drillIndex: number,
    shotIndex: number,
    field: 'shotZone' | 'makes' | 'attempts',
    value: string | number
  ) {
    const newDrills = [...drills];
    if (field === 'makes' || field === 'attempts') {
      newDrills[drillIndex].shots[shotIndex][field] = Number(value);
    } else {
      newDrills[drillIndex].shots[shotIndex][field] = String(value);
    }
    setDrills(newDrills);
  }

  // @ts-ignore
  async function handleSave() {
    setError(null);
    setIsLoading(true);

    try {
      // Validate session
      const sessionResult = sessionSchema.safeParse({
        sessionDate,
        sessionType,
        durationMinutes: Number(durationMinutes),
        intensityRpe: Number(intensityRpe),
        perceivedQuality: Number(perceivedQuality),
        notes: notes || null,
      });

      if (!sessionResult.success) {
        setError('Invalid session data. Please check all fields.');
        setIsLoading(false);
        return;
      }

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      // Create session
      const sessionResponse = await supabase
        .from('training_sessions')
        .insert({
          user_id: user.id,
          session_date: sessionDate,
          session_type: sessionType,
          duration_minutes: Number(durationMinutes),
          intensity_rpe: Number(intensityRpe),
          perceived_quality: Number(perceivedQuality),
          notes: notes || null,
        })
        .select()
        .single();

      const newSession = sessionResponse.data as any;
      const sessionError = sessionResponse.error;

      if (sessionError || !newSession) {
        setError('Failed to create session.');
        setIsLoading(false);
        return;
      }

      // Create drills and shooting entries
      for (const drill of drills) {
        if (!drill.drillName.trim()) continue;

        const drillResponse = await supabase
          .from('session_drills')
          .insert({
            session_id: newSession.id,
            user_id: user.id,
            drill_name: drill.drillName.trim(),
            drill_category: drill.drillCategory,
            duration_minutes: drill.durationMinutes === '' ? null : Number(drill.durationMinutes),
          })
          .select()
          .single();

        const newDrill = drillResponse.data as any;
        const drillError = drillResponse.error;

        if (drillError || !newDrill) continue;

        // Add shooting entries for this drill
        for (const shot of drill.shots) {
          const shotResult = shootingEntrySchema.safeParse({
            shotZone: shot.shotZone,
            makes: shot.makes,
            attempts: shot.attempts,
          });

          if (!shotResult.success) continue;

          await supabase
            .from('shooting_entries')
            .insert({
              drill_id: newDrill.id,
              user_id: user.id,
              shot_zone: shot.shotZone,
              makes: shot.makes,
              attempts: shot.attempts,
            });
        }
      }

      router.push('/basketball');
      router.refresh();
    } catch {
      setError('An unexpected error occurred.');
      setIsLoading(false);
    }
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white">New Basketball Session</h1>
            <p className="text-sm text-zinc-400 mt-1">
              {step === 'session' ? 'Session details and drills' : 'Review and save'}
            </p>
          </div>
          <Link href="/basketball">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        {error && (
          <Alert variant="error" title="Error">
            {error}
          </Alert>
        )}

        {step === 'session' && (
          <div className="space-y-6">
            {/* Session Details */}
            <Card className="border-zinc-800 bg-zinc-900/70">
              <CardHeader>
                <CardTitle>Session Details</CardTitle>
                <CardDescription>Basic info about this basketball session</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Session Date"
                    type="date"
                    value={sessionDate}
                    onChange={(e) => setSessionDate(e.target.value)}
                    required
                  />
                  <Select
                    label="Session Type"
                    value={sessionType}
                    onChange={(e) => setSessionType(e.target.value)}
                    options={[
                      { value: 'shooting', label: 'Shooting Drills' },
                      { value: 'ball-handling', label: 'Ball Handling' },
                      { value: 'footwork', label: 'Footwork' },
                      { value: 'scrimmage', label: 'Scrimmage' },
                      { value: 'pickup', label: 'Pickup Game' },
                      { value: 'game', label: 'Game' },
                      { value: 'mixed', label: 'Mixed' },
                    ]}
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <Input
                    label="Duration (min)"
                    type="number"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  />
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5">
                      Intensity RPE
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={intensityRpe}
                      onChange={(e) => setIntensityRpe(Number(e.target.value))}
                      className="w-full"
                    />
                    <div className="text-xs text-zinc-400 mt-1 text-center">{intensityRpe}/10</div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5">
                      Quality
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={perceivedQuality}
                      onChange={(e) => setPerceivedQuality(Number(e.target.value))}
                      className="w-full"
                    />
                    <div className="text-xs text-zinc-400 mt-1 text-center">{perceivedQuality}/5</div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5">
                    Session Notes (Optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="How did you feel? Any observations?"
                    className="w-full h-20 rounded-xl border border-zinc-700/80 bg-zinc-900/90 px-3.5 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Drills */}
            <Card className="border-zinc-800 bg-zinc-900/70">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Drills & Shooting</CardTitle>
                    <CardDescription>Track what you worked on and your shooting results</CardDescription>
                  </div>
                  <Button variant="secondary" size="sm" onClick={addDrill} className="gap-1">
                    <Plus className="h-3.5 w-3.5" /> Add Drill
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {drills.map((drill, drillIdx) => (
                  <div key={drillIdx} className="space-y-3 p-4 rounded-lg border border-zinc-800 bg-zinc-950/50">
                    <div className="flex items-end gap-2">
                      <div className="flex-1 space-y-2">
                        <Input
                          label="Drill Name"
                          placeholder="e.g., Catch & Shoot 3pt Right Wing"
                          value={drill.drillName}
                          onChange={(e) => {
                            const newDrills = [...drills];
                            newDrills[drillIdx].drillName = e.target.value;
                            setDrills(newDrills);
                          }}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeDrill(drillIdx)}
                        className="text-red-400 hover:bg-red-950/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Select
                        label="Category"
                        value={drill.drillCategory}
                        onChange={(e) => {
                          const newDrills = [...drills];
                          newDrills[drillIdx].drillCategory = e.target.value;
                          setDrills(newDrills);
                        }}
                        options={[
                          { value: 'shooting', label: 'Shooting' },
                          { value: 'ball-handling', label: 'Ball Handling' },
                          { value: 'finishing', label: 'Finishing' },
                          { value: 'footwork', label: 'Footwork' },
                          { value: 'defense', label: 'Defense' },
                          { value: 'conditioning', label: 'Conditioning' },
                        ]}
                      />
                      <Input
                        label="Duration (min)"
                        type="number"
                        placeholder="Optional"
                        value={drill.durationMinutes}
                        onChange={(e) => {
                          const newDrills = [...drills];
                          newDrills[drillIdx].durationMinutes = e.target.value
                            ? Number(e.target.value)
                            : '';
                          setDrills(newDrills);
                        }}
                      />
                    </div>

                    {/* Shooting zones for this drill */}
                    {drill.drillCategory === 'shooting' && (
                      <div className="space-y-2 border-t border-zinc-800 pt-3">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                            Shot Results
                          </label>
                          <button
                            type="button"
                            onClick={() => addShot(drillIdx)}
                            className="text-xs text-orange-400 hover:text-orange-300 font-semibold"
                          >
                            + Add Zone
                          </button>
                        </div>

                        {drill.shots.map((shot, shotIdx) => (
                          <div key={shotIdx} className="flex gap-2 items-end">
                            <Select
                              label=""
                              value={shot.shotZone}
                              onChange={(e) => updateShot(drillIdx, shotIdx, 'shotZone', e.target.value)}
                              options={SHOT_ZONES.map((z) => ({ value: z.id, label: z.label }))}
                              className="text-xs"
                            />
                            <Input
                              label=""
                              type="number"
                              placeholder="Makes"
                              value={shot.makes}
                              onChange={(e) =>
                                updateShot(drillIdx, shotIdx, 'makes', e.target.value)
                              }
                              className="w-20 h-11"
                            />
                            <span className="text-xs text-zinc-500">/</span>
                            <Input
                              label=""
                              type="number"
                              placeholder="Attempts"
                              value={shot.attempts}
                              onChange={(e) =>
                                updateShot(drillIdx, shotIdx, 'attempts', e.target.value)
                              }
                              className="w-20 h-11"
                            />
                            <button
                              type="button"
                              onClick={() => removeShot(drillIdx, shotIdx)}
                              className="text-red-400 hover:text-red-300 p-2"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
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
                  disabled={!sessionDate || drills.every((d) => !d.drillName.trim())}
                >
                  Save Session
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
