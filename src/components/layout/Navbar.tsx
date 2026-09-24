// src/components/layout/Navbar.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Flame, LogOut, User, ShieldAlert } from 'lucide-react';
import type { Profile } from '@/lib/auth';
import { NAV_ITEMS } from './BottomNav';

interface NavbarProps {
  profile: Profile | null;
  isOwner?: boolean;
}

export function Navbar({ profile, isOwner = false }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-4 md:px-8 max-w-7xl mx-auto">
        {/* Brand Logo */}
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center shadow-md shadow-orange-600/30">
            <Flame className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-black tracking-tight text-white uppercase leading-none">
              HoopIQ
            </span>
            <span className="text-[10px] font-semibold text-orange-400 tracking-wider uppercase leading-none mt-0.5">
              Player OS
            </span>
          </div>
        </Link>

        {/* Desktop section links (phones use BottomNav) */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                  isActive ? 'bg-orange-500/10 text-orange-400' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right side: Owner badge, Profile link, Sign Out */}
        <div className="flex items-center gap-3">
          {isOwner && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold">
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>Owner Access</span>
            </div>
          )}

          <Link
            href="/profile"
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${
              pathname === '/profile'
                ? 'border-orange-500 bg-orange-500/10 text-white'
                : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 text-zinc-300'
            }`}
          >
            <div className="h-6 w-6 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-orange-400">
              {profile?.display_name?.charAt(0).toUpperCase() || 'P'}
            </div>
            <span className="text-xs font-medium hidden sm:inline">
              {profile?.display_name || 'Player'}
            </span>
          </Link>

          <button
            type="button"
            onClick={handleSignOut}
            title="Sign out"
            className="h-9 w-9 flex items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-red-400 hover:border-red-900/40 hover:bg-red-950/20 transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
