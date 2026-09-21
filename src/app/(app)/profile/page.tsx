import React from 'react';
import { requireUser, getCurrentProfile } from '@/lib/auth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { User } from 'lucide-react';

export const metadata = { title: 'Profile - HoopIQ' };

export default async function ProfilePage() {
  await requireUser();
  const profile = await getCurrentProfile();

  return (
    <div className="flex-1 overflow-auto p-4 md:p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-slate-600 to-gray-500 flex items-center justify-center shadow-lg">
          <User className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white">Player Profile</h1>
          <p className="text-sm text-zinc-400 mt-1">Your player record and settings</p>
        </div>
      </div>

      <Card className="border-zinc-800 bg-zinc-900/70">
        <CardHeader>
          <CardTitle>Profile Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-zinc-400 font-semibold uppercase mb-1">Name</div>
              <div className="font-semibold text-white">{profile?.display_name}</div>
            </div>
            <div>
              <div className="text-xs text-zinc-400 font-semibold uppercase mb-1">Position</div>
              <div className="font-semibold text-white">{profile?.position || '-'}</div>
            </div>
            <div>
              <div className="text-xs text-zinc-400 font-semibold uppercase mb-1">Height</div>
              <div className="font-semibold text-white">{profile?.height_cm ? `${profile.height_cm} cm` : '-'}</div>
            </div>
            <div>
              <div className="text-xs text-zinc-400 font-semibold uppercase mb-1">Level</div>
              <div className="font-semibold text-white capitalize">{profile?.playing_level || '-'}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
