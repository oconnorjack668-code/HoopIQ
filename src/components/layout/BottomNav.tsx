// src/components/layout/BottomNav.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Target, Dumbbell, Sparkles, BookOpen, Trophy, CalendarCheck } from 'lucide-react';

// Pages that live under the Train hub light up the Train tab
const TRAIN_PATHS = ['/train', '/programs', '/drills', '/guides', '/style-match', '/video', '/ai-coach', '/leaderboard'];

// Phones: five tabs (more than five gets cramped); everything else is in the Train hub
export const NAV_ITEMS = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard, match: ['/dashboard'] },
  { href: '/basketball', label: 'Hoops', icon: Target, match: ['/basketball'] },
  { href: '/workouts', label: 'Gym', icon: Dumbbell, match: ['/workouts'] },
  { href: '/train', label: 'Train', icon: CalendarCheck, match: TRAIN_PATHS },
  { href: '/study', label: 'IQ', icon: BookOpen, match: ['/study'] },
];

// Desktop top bar has room for the most-used hub pages too
export const DESKTOP_NAV_ITEMS = [
  ...NAV_ITEMS.slice(0, 3),
  { href: '/train', label: 'Train', icon: CalendarCheck, match: ['/train', '/programs', '/drills', '/guides', '/style-match', '/video'] },
  { href: '/study', label: 'IQ Study', icon: BookOpen, match: ['/study'] },
  { href: '/ai-coach', label: 'AI Coach', icon: Sparkles, match: ['/ai-coach'] },
  { href: '/leaderboard', label: 'Ranks', icon: Trophy, match: ['/leaderboard'] },
];

export function isNavActive(pathname: string, match: string[]): boolean {
  return match.some((m) => pathname === m || pathname.startsWith(`${m}/`));
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-800/90 bg-zinc-950/95 backdrop-blur-lg md:hidden">
      <div className="grid grid-cols-5 px-1 pt-1.5 safe-bottom">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = isNavActive(pathname, item.match);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition-all ${
                isActive ? 'text-orange-500 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Icon className={`h-6 w-6 ${isActive ? 'scale-110' : ''} transition-transform`} />
              <span className="text-[11px] mt-0.5 tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
