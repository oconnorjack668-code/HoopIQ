// src/app/(app)/goals/page.tsx
import React from 'react';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { loadAchievements } from '@/lib/achievements-server';
import { GoalsEditor, type GoalRow } from './GoalsEditor';
import { Crosshair } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Goals - HoopIQ' };

export default async function GoalsPage() {
  const user = await requireUser();
  const supabase = (await createClient()) as any;

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));

  const [{ data: goals }, achievements, { data: weekShots }] = await Promise.all([
    supabase.from('goals').select('id, goal_type, title, target_value, current_value, period, is_active').eq('user_id', user.id).eq('is_active', true).order('created_at'),
    loadAchievements(user.id),
    supabase.from('shooting_entries').select('makes, attempts').eq('user_id', user.id).gte('created_at', weekStart.toISOString()),
  ]);

  const w = achievements.stats.week;
  const shotTotals = ((weekShots || []) as Array<{ makes: number; attempts: number }>).reduce(
    (t, s) => ({ makes: t.makes + s.makes, attempts: t.attempts + s.attempts }),
    { makes: 0, attempts: 0 }
  );
  const progress: Record<string, number> = {
    weekly_training_days: w.trainingDays,
    weekly_makes: w.makes,
    shooting_pct: shotTotals.attempts ? Math.round((shotTotals.makes / shotTotals.attempts) * 100) : 0,
    strength_days: w.workouts,
    iq_study_items: w.lessons,
  };

  const rows: GoalRow[] = ((goals || []) as Array<GoalRow & { current_value: number }>).map((g) => ({
    ...g,
    progress: g.goal_type === 'custom' ? g.current_value : progress[g.goal_type] ?? 0,
  }));

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-orange-600 to-red-500 flex items-center justify-center shadow-lg">
            <Crosshair className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white">Goals</h1>
            <p className="text-sm text-zinc-400 mt-1">Weekly targets, tracked automatically from what you log</p>
          </div>
        </div>
        <GoalsEditor goals={rows} />
      </div>
    </div>
  );
}
