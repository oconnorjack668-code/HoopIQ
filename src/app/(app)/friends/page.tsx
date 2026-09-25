// src/app/(app)/friends/page.tsx
import React from 'react';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import type { FeedItem, FriendRow } from '@/lib/friends';
import { FriendsClient } from './FriendsClient';
import { Users } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Friends - HoopIQ' };

export default async function FriendsPage() {
  const user = await requireUser();
  const supabase = (await createClient()) as any;

  const [{ data: profile }, overview, feed] = await Promise.all([
    supabase.from('profiles').select('friend_code, display_name').eq('id', user.id).maybeSingle(),
    supabase.rpc('friends_overview'),
    supabase.rpc('friend_feed', { p_limit: 30 }),
  ]);

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-cyan-600 to-emerald-500 flex items-center justify-center shadow-lg">
            <Users className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white">Friends</h1>
            <p className="text-sm text-zinc-400">Train together, compete every week.</p>
          </div>
        </div>

        {overview.error || !profile?.friend_code ? (
          <p className="rounded-xl border border-amber-600/40 bg-amber-600/10 p-4 text-sm text-amber-200">
            Friends isn&apos;t switched on yet. Run migration <code>00021_friends_and_coach_chat.sql</code> in Supabase.
          </p>
        ) : (
          <FriendsClient
            myId={user.id}
            myCode={profile.friend_code}
            rows={(overview.data || []) as FriendRow[]}
            feed={(feed.data || []) as FeedItem[]}
          />
        )}
      </div>
    </div>
  );
}
