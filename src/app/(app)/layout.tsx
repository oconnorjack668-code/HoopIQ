// src/app/(app)/layout.tsx
import React from 'react';
import { requireUser, checkIsOwner, getCurrentProfile } from '@/lib/auth';
import { Navbar } from '@/components/layout/Navbar';
import { BottomNav } from '@/components/layout/BottomNav';

export const metadata = {
  title: 'HoopIQ AI Basketball Trainer',
  description: 'Train with intent. See your progress. Improve every day.',
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();

  // Both are cached per request, so pages that also need them don't query again
  const [profile, isOwner] = await Promise.all([getCurrentProfile(), checkIsOwner()]);

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
