// src/components/basketball/CourtMap.tsx
'use client';

import React from 'react';
import { COURT_LENGTH_FT, COURT_WIDTH_FT } from '@/lib/court';
import { CourtMarkings, S } from './CourtMarkings';

export interface MapShot {
  x: number; // feet
  y: number;
  made: boolean;
}

export function CourtMap({
  shots,
  selected,
  onTap,
}: {
  shots: MapShot[];
  selected: { x: number; y: number } | null;
  onTap: (xFt: number, yFt: number) => void;
}) {
  function handleClick(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * COURT_WIDTH_FT;
    const y = ((e.clientY - rect.top) / rect.height) * COURT_LENGTH_FT;
    onTap(Math.min(COURT_WIDTH_FT, Math.max(0, x)), Math.min(COURT_LENGTH_FT, Math.max(0, y)));
  }

  return (
    <svg
      viewBox={`0 0 ${COURT_WIDTH_FT * S} ${COURT_LENGTH_FT * S}`}
      onClick={handleClick}
      role="img"
      aria-label="Half court. Tap where you are shooting from."
      className="w-full h-auto rounded-2xl bg-amber-950/40 border border-zinc-800 cursor-crosshair select-none touch-manipulation"
    >
      <CourtMarkings />

      {shots.map((s, i) => (
        <circle
          key={i}
          cx={s.x * S}
          cy={s.y * S}
          r={7}
          fill={s.made ? 'rgb(16 185 129 / 0.85)' : 'rgb(239 68 68 / 0.75)'}
          stroke="rgb(9 9 11)"
          strokeWidth={1.5}
        />
      ))}

      {selected && (
        <g>
          <circle cx={selected.x * S} cy={selected.y * S} r={16} fill="none" stroke="rgb(250 204 21)" strokeWidth={3} />
          <circle cx={selected.x * S} cy={selected.y * S} r={4} fill="rgb(250 204 21)" />
        </g>
      )}
    </svg>
  );
}
