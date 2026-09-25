// src/app/(app)/video/VideoHub.tsx
'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { FilmTagger } from '@/components/video/FilmTagger';
import { ClipUploader } from '@/components/video/ClipUploader';
import { VideoAIFeedback, type ShootingSummary } from '@/components/video/VideoAIFeedback';
import type { ShotMechanics } from '@/lib/video/mechanics';
import type { MeasurementSystem } from '@/lib/units';

// MediaPipe is browser-only (WebAssembly, WebGL), so these load on the client only
const Loading = () => <p className="text-sm text-zinc-500">Loading…</p>;
const ShotTracker = dynamic(() => import('@/components/video/ShotTracker').then((m) => m.ShotTracker), { ssr: false, loading: Loading });
const FormCheck = dynamic(() => import('@/components/video/FormCheck').then((m) => m.FormCheck), { ssr: false, loading: Loading });
const JumpTest = dynamic(() => import('@/components/video/JumpTest').then((m) => m.JumpTest), { ssr: false, loading: Loading });

type Tab = 'shots' | 'form' | 'jump' | 'film' | 'clips';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'shots', label: 'Shot tracker' },
  { id: 'form', label: 'Form check' },
  { id: 'jump', label: 'Jump test' },
  { id: 'film', label: 'Game film' },
  { id: 'clips', label: 'Saved clips' },
];

export function VideoHub({
  heightCm,
  position,
  hand,
  units,
}: {
  heightCm: number | null;
  position: string | null;
  hand: 'right' | 'left';
  units: MeasurementSystem;
}) {
  const [tab, setTab] = useState<Tab>('shots');
  const [formFile, setFormFile] = useState<File | null>(null);
  const [formShotMs, setFormShotMs] = useState<number | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [shooting, setShooting] = useState<ShootingSummary | null>(null);
  const [mechanics, setMechanics] = useState<ShotMechanics | null>(null);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-5 gap-1 rounded-xl bg-zinc-900 p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-lg py-2 text-xs font-semibold ${tab === t.id ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tabs stay mounted so switching doesn't lose a session in progress */}
      <div className={tab === 'shots' ? '' : 'hidden'}>
        <ShotTracker
          onSummary={setShooting}
          onCheckForm={(file, shotMs) => {
            setFormFile(file);
            setFormShotMs(shotMs);
            setFormKey((k) => k + 1);
            setTab('form');
          }}
        />
      </div>
      <div className={tab === 'form' ? '' : 'hidden'}>
        <FormCheck key={formKey} initialFile={formFile} shotTimeMs={formShotMs} heightCm={heightCm} hand={hand} onResult={setMechanics} />
      </div>
      <div className={tab === 'jump' ? '' : 'hidden'}>
        <JumpTest units={units} />
      </div>
      <div className={tab === 'film' ? '' : 'hidden'}>
        <FilmTagger heightCm={heightCm} position={position} />
      </div>
      <div className={tab === 'clips' ? '' : 'hidden'}>
        <ClipUploader />
      </div>

      {(tab === 'shots' || tab === 'form') && <VideoAIFeedback key={`${!!shooting}-${!!mechanics}`} shooting={shooting} mechanics={mechanics} />}
    </div>
  );
}
