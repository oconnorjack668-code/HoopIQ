// src/app/(app)/layout.tsx
import React from 'react';
import { requireUser, checkIsOwner } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Navbar } from '@/components/layout/Navbar';
import { BottomNav } from '@/components/layout/BottomNav';

export const metadata = {
  title: 'HoopIQ - Player Development OS',
  description: 'Train with intent. See your progress. Improve every day.',
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  const isOwner = await checkIsOwner();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <Navbar profile={profile} isOwner={isOwner} />

      <main className="flex-1 flex flex-col overflow-hidden pb-20 md:pb-0">
        {children}
      </main>

      <BottomNav />
    </div>
  );
}
