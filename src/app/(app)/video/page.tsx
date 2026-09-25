// src/app/(app)/video/page.tsx
import React from 'react';
import { requireUser, getCurrentProfile } from '@/lib/auth';
import { VideoHub } from './VideoHub';
import { asMeasurementSystem } from '@/lib/units';
import { Video } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Video AI - HoopIQ' };

export default async function VideoPage() {
  await requireUser();
  const profile = await getCurrentProfile();

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8 max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-red-600 to-pink-500 flex items-center justify-center shadow-lg">
            <Video className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white">Video AI</h1>
            <p className="text-sm text-zinc-400 mt-1">Shot tracking, form analysis, jump test and game film, all on your phone</p>
          </div>
        </div>
        <VideoHub
          heightCm={profile?.height_cm ?? null}
          position={profile?.position ?? null}
          hand={profile?.dominant_hand === 'left' ? 'left' : 'right'}
          units={asMeasurementSystem(profile?.measurement_system)}
        />
      </div>
    </div>
  );
}
