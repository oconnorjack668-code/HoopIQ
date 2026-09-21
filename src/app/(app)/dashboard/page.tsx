// src/app/(app)/dashboard/page.tsx
import React from 'react';
import { requireUser, getCurrentProfile } from '@/lib/auth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LayoutGrid, Zap } from 'lucide-react';

export const metadata = {
  title: 'Dashboard - HoopIQ',
};

export default async function DashboardPage() {
  const user = await requireUser();
  const profile = await getCurrentProfile();

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center shadow-lg">
              <LayoutGrid className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white">Welcome back, {profile?.display_name || 'Player'}</h1>
              <p className="text-sm text-zinc-400 mt-1">
                Ready to train with intent? Let's track your progress today.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'This Week', value: '0', unit: 'sessions', color: 'orange' },
            { label: 'Shooting %', value: '--', unit: 'overall', color: 'purple' },
            { label: 'Current Streak', value: '0', unit: 'days', color: 'emerald' },
            { label: 'AI Credits', value: '3', unit: '/month', color: 'amber' },
          ].map((stat) => (
            <Card key={stat.label} className="border-zinc-800 bg-zinc-900/70">
              <CardContent className="p-5">
                <div className="text-xs text-zinc-400 font-semibold uppercase tracking-wider mb-2">
                  {stat.label}
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-black text-white">{stat.value}</span>
                  <Badge variant={stat.color as any} className="text-xs">
                    {stat.unit}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Feature Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="border-zinc-800 bg-zinc-900/70 hover:bg-zinc-900/90 transition-colors cursor-pointer">
            <CardHeader>
              <div className="flex items-center gap-2 text-orange-400 text-xs font-bold uppercase mb-2">
                <Zap className="h-4 w-4" /> New
              </div>
              <CardTitle>Log a Basketball Session</CardTitle>
              <CardDescription>
                Track your shooting drills, game minutes, and session quality.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-zinc-400">
                Capture makes/attempts by shot zone, drill type, RPE, and personal notes.
              </div>
            </CardContent>
          </Card>

          <Card className="border-zinc-800 bg-zinc-900/70 hover:bg-zinc-900/90 transition-colors cursor-pointer">
            <CardHeader>
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase mb-2">
                <Zap className="h-4 w-4" /> New
              </div>
              <CardTitle>Log a Workout</CardTitle>
              <CardDescription>
                Record strength, plyometrics, mobility, or athletic testing.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-zinc-400">
                Add sets, reps, load, RPE, and detect personal records automatically.
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Coming Soon Section */}
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardHeader>
            <CardTitle className="text-lg">Dashboard Features (Coming Soon)</CardTitle>
            <CardDescription>
              Milestone 1 foundation is live. Next up:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-zinc-400">
              <li className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-orange-500" />
                <span>Shooting percentage trends and shot-zone breakdowns</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>Workout progression charts and personal record tracking</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-purple-500" />
                <span>AI-powered post-session summaries and development insights</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-500" />
                <span>Basketball IQ study topics and curated learning modules</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
