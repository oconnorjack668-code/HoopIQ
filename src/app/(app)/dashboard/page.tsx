// src/app/(app)/dashboard/page.tsx
import React from 'react';
import { requireUser, getCurrentProfile, getCurrentSubscription } from '@/lib/auth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { calculateDashboardMetrics, getShootingByZone } from '@/lib/dashboard';
import { LayoutGrid, Zap, TrendingUp, Target, Award, Flame, Users, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/server';
import { getActiveProgram } from '@/lib/programs';
import { loadAchievements } from '@/lib/achievements-server';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Dashboard - HoopIQ',
};

export default async function DashboardPage() {
  const user = await requireUser();
  const profile = await getCurrentProfile();

  // Players who never finished setup (e.g. the confirmation link didn't land them
  // on /onboarding) are sent there from their landing page
  if (!profile?.onboarding_completed) {
    redirect('/onboarding');
  }

  const supabase = await createClient();
  const [subscription, metrics, shootingByZone, activeProgram, achievements] = await Promise.all([
    getCurrentSubscription(),
    calculateDashboardMetrics(user.id),
    getShootingByZone(user.id),
    getActiveProgram(supabase as any, user.id),
    // Also awards any weekly challenges / badges earned since the last visit
    loadAchievements(user.id),
  ]);

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

        {/* Rank */}
        <Link href="/achievements" className="mb-4 flex items-center justify-between rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 hover:bg-amber-500/15">
          <span className="text-sm text-zinc-200">
            <span className="font-black text-amber-300">{achievements.rank.name}</span> · {achievements.xp.toLocaleString()} XP
            {achievements.newlyEarned.length > 0 && <span className="ml-2 text-emerald-400">New badge: {achievements.newlyEarned[0]}!</span>}
          </span>
          <span className="text-xs text-amber-300">
            {achievements.challenges.filter((c) => c.done).length}/{achievements.challenges.length} weekly challenges →
          </span>
        </Link>

        {/* Today */}
        <div className="mb-8 rounded-2xl border border-orange-600/40 bg-gradient-to-br from-orange-600/15 to-transparent p-5">
          <div className="text-xs font-bold uppercase tracking-wider text-orange-300">Today</div>
          {activeProgram?.next ? (
            <>
              <div className="mt-1 text-xl font-black text-white">{activeProgram.next.title}</div>
              <div className="text-sm text-zinc-300">
                {activeProgram.program.name} · Week {activeProgram.next.week}, session {activeProgram.next.day} ·{' '}
                {activeProgram.next.estimated_minutes} min
              </div>
              <Link href={`/programs/${activeProgram.program.slug}/day/${activeProgram.next.id}`} className="mt-3 inline-block">
                <Button variant="primary" size="sm">Start today&apos;s session</Button>
              </Link>
            </>
          ) : (
            <>
              <div className="mt-1 text-lg font-bold text-white">
                {activeProgram ? `${activeProgram.program.name} complete!` : 'What are you working on today?'}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href="/programs">
                  <Button variant="primary" size="sm">{activeProgram ? 'Pick your next program' : 'Follow a program'}</Button>
                </Link>
                <Link href="/train/generate">
                  <Button variant="outline" size="sm">Build a quick workout</Button>
                </Link>
              </div>
            </>
          )}
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
                  {subscription?.plan_type === 'pro' || subscription?.plan_type === 'owner'
                    ? '∞'
                    : subscription?.ai_credits_remaining || 0}
                </span>
                <Badge variant="default" className="text-xs">{subscription?.plan_type || 'free'}</Badge>
              </div>
              <div className="text-xs text-zinc-500 mt-2">
                {subscription?.plan_type === 'pro' || subscription?.plan_type === 'owner'
                  ? 'Unlimited'
                  : '1 credit per AI report'}
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

        {/* Social + coach shortcuts */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <Link href="/friends" className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3 hover:bg-zinc-900">
            <div className="h-9 w-9 rounded-lg bg-cyan-600/20 flex items-center justify-center">
              <Users className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">Friends</div>
              <div className="text-xs text-zinc-400">Weekly leaderboard</div>
            </div>
          </Link>
          <Link href="/ai-coach/chat" className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3 hover:bg-zinc-900">
            <div className="h-9 w-9 rounded-lg bg-purple-600/20 flex items-center justify-center">
              <MessageCircle className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">Ask Coach</div>
              <div className="text-xs text-zinc-400">Chat about your game</div>
            </div>
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
                      <div className="capitalize">{zone.zone.replace(/-/g, ' ')}</div>
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
                    {metrics.consistency}%
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
