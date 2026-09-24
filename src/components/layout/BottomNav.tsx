// src/components/layout/BottomNav.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Target,
  Dumbbell,
  Sparkles,
  BookOpen,
  Trophy,
  Video,
} from 'lucide-react';

// Shared with the desktop links in Navbar
export const NAV_ITEMS = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/basketball', label: 'Hoops', icon: Target },
  { href: '/workouts', label: 'Gym', icon: Dumbbell },
  { href: '/ai-coach', label: 'AI Coach', icon: Sparkles },
  { href: '/study', label: 'IQ Study', icon: BookOpen },
  { href: '/leaderboard', label: 'Ranks', icon: Trophy },
  { href: '/video', label: 'Video', icon: Video },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-800/90 bg-zinc-950/95 backdrop-blur-lg md:hidden">
      <div className="flex items-center justify-around px-1 py-1.5 safe-bottom">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
                isActive
                  ? 'text-orange-500 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? 'scale-110' : ''} transition-transform`} />
              <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
