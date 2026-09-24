// src/app/(app)/basketball/page.tsx
import React from 'react';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { Plus, Target, TrendingUp } from 'lucide-react';
import { formatShootingPercentage } from '@/lib/stats';

export const metadata = {
  title: 'Basketball Sessions - HoopIQ',
};

export default async function BasketballPage() {
  const user = await requireUser();
  const supabase = await createClient();

  // Fetch recent sessions
  const { data: sessions } = await supabase
    .from('training_sessions')
    .select('*')
    .eq('user_id', user.id)
    .order('session_date', { ascending: false })
    .limit(10)
    .returns<Array<{
      id: string;
      session_type: string;
      session_date: string;
      duration_minutes: number;
      intensity_rpe: number;
      perceived_quality: number;
      notes: string | null;
    }>>();

  // Fetch all shooting data for summary stats
  const { data: shootingData } = await supabase
    .from('shooting_entries')
    .select('makes, attempts')
    .eq('user_id', user.id)
    .returns<Array<{
      makes: number;
      attempts: number;
    }>>();

  const totalMakes = shootingData?.reduce((sum, s) => sum + s.makes, 0) || 0;
  const totalAttempts = shootingData?.reduce((sum, s) => sum + s.attempts, 0) || 0;
  const overallPct = formatShootingPercentage(totalMakes, totalAttempts);

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center shadow-lg">
                <Target className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight text-white">Basketball Sessions</h1>
                <p className="text-sm text-zinc-400 mt-1">Track drills, shooting, and game minutes</p>
              </div>
            </div>
            <Link href="/basketball/new">
              <Button variant="primary" size="lg" className="gap-2">
                <Plus className="h-4 w-4" /> New Session
              </Button>
            </Link>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="border-zinc-800 bg-zinc-900/70">
            <CardContent className="p-5">
              <div className="text-xs text-zinc-400 font-semibold uppercase tracking-wider mb-2">
                Career Shooting %
              </div>
              <div className="flex items-center justify-between">
                <span className="text-3xl font-black text-orange-400">{overallPct}</span>
                <div className="text-right">
                  <div className="text-xs text-zinc-400">{totalMakes} makes</div>
                  <div className="text-xs text-zinc-500">{totalAttempts} attempts</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-zinc-800 bg-zinc-900/70">
            <CardContent className="p-5">
              <div className="text-xs text-zinc-400 font-semibold uppercase tracking-wider mb-2">
                Total Sessions
              </div>
              <span className="text-3xl font-black text-emerald-400">
                {sessions?.length || 0}
              </span>
            </CardContent>
          </Card>

          <Card className="border-zinc-800 bg-zinc-900/70">
            <CardContent className="p-5">
              <div className="text-xs text-zinc-400 font-semibold uppercase tracking-wider mb-2">
                Last Session
              </div>
              <span className="text-xs text-zinc-300">
                {sessions?.[0]
                  ? new Date(sessions[0].session_date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })
                  : 'None yet'}
              </span>
            </CardContent>
          </Card>
        </div>

        {/* Session History */}
        {sessions && sessions.length > 0 ? (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-orange-400" />
              Recent Sessions
            </h2>
            {sessions.map((session) => (
              <div key={session.id}>
                <Card className="border-zinc-800 bg-zinc-900/70">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="space-y-1">
                      <h3 className="font-semibold text-white capitalize">
                        {session.session_type.replace('-', ' ')}
                      </h3>
                      <p className="text-xs text-zinc-400">
                        {new Date(session.session_date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })} · {session.duration_minutes} min · RPE {session.intensity_rpe}/10
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-semibold text-zinc-300">
                        Quality: {session.perceived_quality}/5
                      </div>
                      <div className="text-xs text-zinc-500 mt-1">
                        {session.notes ? 'Has notes' : ''}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        ) : (
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardContent className="p-12 text-center">
              <Target className="h-12 w-12 text-zinc-700 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-zinc-300 mb-1">No sessions yet</h3>
              <p className="text-sm text-zinc-400 mb-6">
                Start logging your first basketball session to track your progress.
              </p>
              <Link href="/basketball/new">
                <Button variant="primary" size="lg">
                  Create First Session
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
