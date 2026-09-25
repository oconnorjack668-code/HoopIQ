// src/app/(app)/achievements/page.tsx
import React from 'react';
import Link from 'next/link';
import { Target, Flame, Crown, CircleDot, Gem, Zap, Trophy, Dumbbell, BookOpen, GraduationCap, CalendarCheck, Video, Award } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { loadAchievements } from '@/lib/achievements-server';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Achievements - HoopIQ' };

const BADGE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Target, Flame, Crown, CircleDot, Gem, Zap, Trophy, Dumbbell, BookOpen, GraduationCap, CalendarCheck, Video,
};

const TIER_STYLES: Record<string, string> = {
  bronze: 'from-amber-800 to-orange-700',
  silver: 'from-zinc-400 to-zinc-600',
  gold: 'from-amber-400 to-yellow-600',
  diamond: 'from-cyan-400 to-blue-600',
  legend: 'from-purple-500 to-fuchsia-600',
};

export default async function AchievementsPage() {
  const user = await requireUser();
  const a = await loadAchievements(user.id);

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-8">
        {/* Rank */}
        <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-br from-amber-500/15 to-transparent p-5">
          <div className="text-xs font-bold uppercase tracking-wider text-amber-300">Your rank</div>
          <div className="text-3xl font-black text-white">{a.rank.name}</div>
          <div className="text-sm text-zinc-300">{a.xp.toLocaleString()} XP</div>
          {a.rank.next && (
            <>
              <div className="mt-3 h-2 rounded-full bg-zinc-800 overflow-hidden">
                <div className="h-full bg-amber-400" style={{ width: `${Math.round(a.rank.progress * 100)}%` }} />
              </div>
              <div className="mt-1 text-xs text-zinc-400">
                {(a.rank.next.min - a.xp).toLocaleString()} XP to {a.rank.next.name}
              </div>
            </>
          )}
          <p className="mt-3 text-xs text-zinc-500">
            XP comes from sessions, workouts, makes, lessons, personal records, weekly challenges and badges.
          </p>
          {a.newlyEarned.length > 0 && (
            <p className="mt-2 text-sm font-semibold text-emerald-400">New badge{a.newlyEarned.length > 1 ? 's' : ''}: {a.newlyEarned.join(', ')}!</p>
          )}
        </div>

        {/* Weekly challenges */}
        <section>
          <h2 className="text-lg font-bold text-white mb-1">This week&apos;s challenges</h2>
          <p className="text-xs text-zinc-500 mb-3">Reset every Monday. Points count toward the leaderboard.</p>
          <div className="space-y-2">
            {a.challenges.map((c) => (
              <div key={c.id} className={`rounded-2xl border p-4 ${c.done ? 'border-emerald-600/40 bg-emerald-600/10' : 'border-zinc-800 bg-zinc-900/70'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-white">{c.title}</div>
                    <div className="text-xs text-zinc-400">{c.description}</div>
                  </div>
                  <div className={`text-sm font-black ${c.done ? 'text-emerald-400' : 'text-amber-400'}`}>{c.done ? '✓' : `+${c.points}`}</div>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                  <div className={`h-full ${c.done ? 'bg-emerald-500' : 'bg-amber-400'}`} style={{ width: `${Math.round((c.current / c.target) * 100)}%` }} />
                </div>
                <div className="mt-1 text-[11px] text-zinc-500">
                  {c.current}/{c.target}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Badges */}
        <section>
          <h2 className="text-lg font-bold text-white mb-3">
            Badges <span className="text-sm text-zinc-500">{a.badges.filter((b) => b.earned).length}/{a.badges.length}</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {a.badges.map((b) => {
              const Icon = BADGE_ICONS[b.icon] || Award;
              return (
                <div key={b.id} className={`rounded-2xl border border-zinc-800 p-3 text-center ${b.earned ? 'bg-zinc-900/70' : 'bg-zinc-950 opacity-50'}`}>
                  <div className={`mx-auto h-12 w-12 rounded-full bg-gradient-to-br ${b.earned ? TIER_STYLES[b.tier] : 'from-zinc-800 to-zinc-800'} flex items-center justify-center`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="mt-2 text-sm font-semibold text-white">{b.title}</div>
                  <div className="text-[11px] text-zinc-500">{b.description}</div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 text-sm">
          <Link href="/goals" className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 hover:bg-zinc-900">
            <div className="font-semibold text-white">My goals</div>
            <div className="text-xs text-zinc-500">Set weekly targets</div>
          </Link>
          <Link href="/leaderboard" className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 hover:bg-zinc-900">
            <div className="font-semibold text-white">Leaderboard</div>
            <div className="text-xs text-zinc-500">Season points</div>
          </Link>
        </section>

        <div className="text-xs text-zinc-500">
          Longest streak {a.stats.longestStreak} days · current {a.stats.currentStreak} · {a.stats.totalMakes.toLocaleString()} makes logged
        </div>
      </div>
    </div>
  );
}
