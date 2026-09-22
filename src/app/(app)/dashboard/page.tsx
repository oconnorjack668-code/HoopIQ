// src/app/(app)/dashboard/page.tsx
import React from 'react';
import { requireUser, getCurrentProfile, getCurrentSubscription } from '@/lib/auth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { calculateDashboardMetrics, getSessionTrends, getShootingByZone } from '@/lib/dashboard';
import { LayoutGrid, Zap, TrendingUp, Target, Award, Flame } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Dashboard - HoopIQ',
};

export default async function DashboardPage() {
  const user = await requireUser();
  const profile = await getCurrentProfile();
  const subscription = await getCurrentSubscription();
  const metrics = await calculateDashboardMetrics(user.id);
  const trends = await getSessionTrends(user.id, 30);
  const shootingByZone = await getShootingByZone(user.id);

  const weeklyGoalPercentage = Math.round((metrics.weeklyGoalProgress / metrics.weeklyGoalTarget) * 100);

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
              <h1 className="text-3xl font-black tracking-tight text-white">
                Welcome back, {profile?.display_name || 'Player'}
              </h1>
              <p className="text-sm text-zinc-400 mt-1">
                Ready to train with intent? Let's track your progress today.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="border-zinc-800 bg-zinc-900/70">
            <CardContent className="p-5">
              <div className="text-xs text-zinc-400 font-semibold uppercase tracking-wider mb-2">This Week</div>
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-3xl font-black text-orange-400">{metrics.thisWeekSessions}</span>
                <Badge variant="orange" className="text-xs">sessions</Badge>
              </div>
              <div className="text-xs text-zinc-500">Goal: {metrics.weeklyGoalTarget} days</div>
              <div className="mt-2 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all"
                  style={{ width: `${Math.min(weeklyGoalPercentage, 100)}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-zinc-800 bg-zinc-900/70">
            <CardContent className="p-5">
              <div className="text-xs text-zinc-400 font-semibold uppercase tracking-wider mb-2">Shooting %</div>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-black text-purple-400">{metrics.shootingPercentage.toFixed(1)}%</span>
                <Badge variant="purple" className="text-xs">career</Badge>
              </div>
              <div className="text-xs text-zinc-500 mt-2">{shootingByZone.length} zones tracked</div>
            </CardContent>
          </Card>

          <Card className="border-zinc-800 bg-zinc-900/70">
            <CardContent className="p-5">
              <div className="text-xs text-zinc-400 font-semibold uppercase tracking-wider mb-2">Streak</div>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-black text-emerald-400">{metrics.currentStreak}</span>
                <Badge variant="success" className="text-xs">days</Badge>
              </div>
              <div className="text-xs text-zinc-500 mt-2">Keep it going!</div>
            </CardContent>
          </Card>

          <Card className="border-zinc-800 bg-zinc-900/70">
            <CardContent className="p-5">
              <div className="text-xs text-zinc-400 font-semibold uppercase tracking-wider mb-2">AI Credits</div>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-black text-amber-400">
                  {subscription?.ai_credits_remaining || 0}
                </span>
                <Badge variant="default" className="text-xs">monthly</Badge>
              </div>
              <div className="text-xs text-zinc-500 mt-2">
                {subscription?.plan_type === 'pro' || subscription?.plan_type === 'owner'
                  ? 'Unlimited'
                  : 'Free tier'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Link href="/basketball/new">
            <Button variant="primary" className="w-full h-16 justify-start gap-3 text-left px-5">
              <div className="h-10 w-10 rounded-lg bg-orange-600 flex items-center justify-center">
                <Target className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="font-bold text-sm">Log Basketball Session</div>
                <div className="text-xs opacity-90">Track drills and shooting</div>
              </div>
            </Button>
          </Link>

          <Link href="/workouts/new">
            <Button variant="primary" className="w-full h-16 justify-start gap-3 text-left px-5" style={{ '--tw-gradient-from': '#059669' } as any}>
              <div className="h-10 w-10 rounded-lg bg-emerald-600 flex items-center justify-center">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="font-bold text-sm">Log Workout</div>
                <div className="text-xs opacity-90">Strength, mobility, or tests</div>
              </div>
            </Button>
          </Link>
        </div>

        {/* Top Shooting Zones */}
        {shootingByZone.length > 0 && (
          <Card className="border-zinc-800 bg-zinc-900/70 mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-orange-400" />
                Top Shooting Zones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {shootingByZone.slice(0, 5).map((zone, idx) => (
                  <div key={zone.zone} className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/50 border border-zinc-800/60">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-xs font-bold text-white">
                        {idx + 1}
                      </div>
                      <div className="capitalize">{zone.zone.replace('-', ' ')}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-orange-400">{zone.percentage.toFixed(1)}%</div>
                      <div className="text-xs text-zinc-500">{zone.makes}/{zone.attempts}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-zinc-400 font-semibold uppercase mb-1">Total Sessions</div>
                  <div className="text-2xl font-black text-white">{metrics.totalSessions}</div>
                </div>
                <TrendingUp className="h-8 w-8 text-zinc-700" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-zinc-400 font-semibold uppercase mb-1">Personal Records</div>
                  <div className="text-2xl font-black text-amber-400">{metrics.personalRecords}</div>
                </div>
                <Award className="h-8 w-8 text-zinc-700" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-zinc-400 font-semibold uppercase mb-1">Consistency</div>
                  <div className="text-2xl font-black text-emerald-400">
                    {trends.length > 0 ? Math.round((trends.filter((t) => t.sessions > 0).length / trends.length) * 100) : 0}%
                  </div>
                </div>
                <Flame className="h-8 w-8 text-zinc-700" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Features */}
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardHeader>
            <CardTitle className="text-lg">Next Milestone: AI Coach & Video</CardTitle>
            <CardDescription>Coming soon</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-zinc-400">
              <li className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-purple-500" />
                AI-powered coaching reports with session comparisons
              </li>
              <li className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-red-500" />
                Private video uploads with pose analysis and trending
              </li>
              <li className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-500" />
                Advanced charts and progress visualization
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
