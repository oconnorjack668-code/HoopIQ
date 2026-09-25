// src/app/(app)/train/page.tsx
import React from 'react';
import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { CalendarCheck, Wand2, ListChecks, Sparkles, Video, Users, BookHeart, Trophy, ChevronRight, Medal, Crosshair, Crown, Shield, UserPlus, MessageCircle, ClipboardList } from 'lucide-react';

export const metadata = { title: 'Train - HoopIQ' };

const SECTIONS = [
  { href: '/programs', icon: CalendarCheck, title: 'Programs', desc: 'Multi-week plans: shooting, handles, vertical, full off-season', color: 'text-orange-400' },
  { href: '/train/generate', icon: Wand2, title: 'Workout Builder', desc: 'Pick your time and focus, get a workout instantly', color: 'text-amber-400' },
  { href: '/drills', icon: ListChecks, title: 'Drill Library', desc: '150 drills with steps, cues and common mistakes', color: 'text-orange-300' },
  { href: '/style-match', icon: Users, title: 'Play Style Match', desc: 'Which NBA players you play like, and what to copy', color: 'text-cyan-400' },
  { href: '/games', icon: ClipboardList, title: 'Game Stats', desc: 'Track points, rebounds and assists live; season averages', color: 'text-amber-400' },
  { href: '/teams', icon: Shield, title: 'Teams', desc: 'Join your team or coach one: assignments and roster', color: 'text-blue-400' },
  { href: '/friends', icon: UserPlus, title: 'Friends', desc: 'Weekly friends leaderboard and activity', color: 'text-cyan-400' },
  { href: '/ai-coach', icon: Sparkles, title: 'AI Coach', desc: 'Personal feedback on your sessions', color: 'text-purple-400' },
  { href: '/ai-coach/chat', icon: MessageCircle, title: 'Ask Coach', desc: 'Chat with an AI coach that knows your numbers', color: 'text-purple-300' },
  { href: '/video', icon: Video, title: 'Video AI', desc: 'Shot tracking, highlight reels, form check, jump test', color: 'text-red-400' },
  { href: '/guides', icon: BookHeart, title: 'Guides', desc: 'Mental game, recovery, nutrition, injury prevention', color: 'text-emerald-400' },
  { href: '/achievements', icon: Medal, title: 'Achievements', desc: 'Weekly challenges, badges and your rank', color: 'text-amber-400' },
  { href: '/goals', icon: Crosshair, title: 'Goals', desc: 'Set weekly targets and track them', color: 'text-orange-400' },
  { href: '/pro', icon: Crown, title: 'HoopIQ Pro', desc: 'Unlimited AI coaching', color: 'text-amber-300' },
  { href: '/leaderboard', icon: Trophy, title: 'Leaderboard', desc: 'Season points and streaks', color: 'text-amber-300' },
];

export default async function TrainPage() {
  await requireUser();

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8 max-w-3xl mx-auto">
        <h1 className="text-3xl font-black tracking-tight text-white mb-1">Train</h1>
        <p className="text-sm text-zinc-400 mb-6">Everything to plan, learn and improve</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            return (
              <Link key={s.href} href={s.href} className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 hover:bg-zinc-900">
                <Icon className={`h-6 w-6 ${s.color} flex-shrink-0`} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white">{s.title}</div>
                  <div className="text-xs text-zinc-500">{s.desc}</div>
                </div>
                <ChevronRight className="h-4 w-4 text-zinc-600" />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
