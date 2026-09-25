// src/app/(app)/players/[id]/page.tsx
// A player's card: display name, season points, badges, streak (friends/teammates) and only
// the details they chose to show in Settings. Age is never shown. (player_card, migration 00024)
import React from 'react';
import Link from 'next/link';
import { requireUser, getCurrentProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { asMeasurementSystem, formatHeight } from '@/lib/units';
import { countryName } from '@/lib/regions';
import { ArrowLeft, Award, Flame, Lock, MapPin, Trophy } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Player - HoopIQ' };

interface Card {
  user_id: string;
  display_name: string;
  is_me: boolean;
  is_friend: boolean;
  position: string | null;
  height_cm: number | null;
  country: string | null;
  region: string | null;
  badges: number;
  badge_titles: string[];
  season_points: number | null;
  streak: number | null;
}

export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser();
  const [supabase, me] = await Promise.all([createClient(), getCurrentProfile()]);
  const { data } = await (supabase as any).rpc('player_card', { p_user: id });
  const card = data as Card | null;
  const units = asMeasurementSystem(me?.measurement_system);

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8 max-w-xl mx-auto space-y-5">
        <Link href="/leaderboard" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200">
          <ArrowLeft className="h-4 w-4" /> Leaderboard
        </Link>

        {!card ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-8 text-center">
            <Lock className="h-8 w-8 text-zinc-600 mx-auto mb-2" />
            <p className="font-semibold text-white">This profile is private</p>
            <p className="text-sm text-zinc-400">Only friends and teammates can see it.</p>
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 text-center">
              <div className="mx-auto mb-3 h-16 w-16 rounded-full bg-zinc-800 flex items-center justify-center text-2xl font-black text-orange-400">
                {card.display_name.charAt(0).toUpperCase()}
              </div>
              <h1 className="text-2xl font-black text-white">{card.display_name}</h1>
              <p className="text-sm text-zinc-400">
                {[card.position, card.height_cm ? formatHeight(card.height_cm, units) : null].filter(Boolean).join(' · ')}
              </p>
              {(card.region || card.country) && (
                <p className="mt-1 text-xs text-zinc-500 flex items-center justify-center gap-1">
                  <MapPin className="h-3 w-3" /> {[card.region, countryName(card.country)].filter(Boolean).join(', ')}
                </p>
              )}
              {card.is_me && (
                <Link href="/settings" className="mt-3 inline-block text-xs text-cyan-400 underline">
                  Choose what others see in Settings → Privacy
                </Link>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3">
                <Trophy className="h-5 w-5 text-amber-400 mx-auto" />
                <div className="text-xl font-black text-white">{card.season_points ?? 0}</div>
                <div className="text-[11px] text-zinc-500">season pts</div>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3">
                <Award className="h-5 w-5 text-amber-300 mx-auto" />
                <div className="text-xl font-black text-white">{card.badges}</div>
                <div className="text-[11px] text-zinc-500">badges</div>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3">
                <Flame className="h-5 w-5 text-orange-400 mx-auto" />
                <div className="text-xl font-black text-white">{card.streak ?? '–'}</div>
                <div className="text-[11px] text-zinc-500">day streak</div>
              </div>
            </div>

            {card.badge_titles.length > 0 && (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
                <h2 className="text-sm font-semibold text-zinc-300 mb-2">Recent badges</h2>
                <div className="flex flex-wrap gap-2">
                  {card.badge_titles.map((b, i) => (
                    <span key={`${b}-${i}`} className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-200">
                      {b}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
