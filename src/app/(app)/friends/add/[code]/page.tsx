// src/app/(app)/friends/add/[code]/page.tsx
// Invite links (hoopiq…/friends/add/ABC123) land here after login.
import React from 'react';
import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { normaliseCode } from '@/lib/friends';
import { AddFriendButton } from './AddFriendButton';
import { UserPlus } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Add friend - HoopIQ' };

export default async function AddFriendPage({ params }: { params: Promise<{ code: string }> }) {
  const user = await requireUser();
  const code = normaliseCode((await params).code);
  const supabase = (await createClient()) as any;
  const { data } = await supabase.rpc('friend_code_lookup', { p_code: code });
  const player = (data as Array<{ user_id: string; display_name: string }> | null)?.[0];

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="max-w-sm w-full rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 text-center space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-600/20">
          <UserPlus className="h-7 w-7 text-cyan-400" />
        </div>
        {!player ? (
          <>
            <h1 className="text-xl font-black text-white">Invite not found</h1>
            <p className="text-sm text-zinc-400">This invite link doesn&apos;t match a player. Ask your friend for their 6-character code.</p>
          </>
        ) : player.user_id === user.id ? (
          <>
            <h1 className="text-xl font-black text-white">That&apos;s your invite</h1>
            <p className="text-sm text-zinc-400">Send this link to friends so they can add you.</p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-black text-white">Add {player.display_name}?</h1>
            <p className="text-sm text-zinc-400">
              You&apos;ll see each other&apos;s weekly training totals and badges, and compete on the friends leaderboard.
            </p>
            <AddFriendButton code={code} />
          </>
        )}
        <Link href="/friends" className="block text-sm text-zinc-400 underline">
          Go to Friends
        </Link>
      </div>
    </div>
  );
}
