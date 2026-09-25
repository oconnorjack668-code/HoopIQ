// src/components/basketball/CourtMap.tsx
'use client';

import React from 'react';
import { COURT_LENGTH_FT, COURT_WIDTH_FT, HOOP } from '@/lib/court';

// 10 SVG units per foot; the hoop is at the top, half court at the bottom.
const S = 10;

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
      <g fill="none" stroke="rgb(161 161 170 / 0.55)" strokeWidth={2}>
        {/* Paint and free throw circle */}
        <rect x={17 * S} y={0} width={16 * S} height={19 * S} />
        <circle cx={25 * S} cy={19 * S} r={6 * S} />
        {/* Three point line: corner straights + arc */}
        <path d={`M ${3 * S} 0 L ${3 * S} ${14 * S} A ${23.75 * S} ${23.75 * S} 0 0 0 ${47 * S} ${14 * S} L ${47 * S} 0`} />
        {/* Restricted area, backboard, rim */}
        <path d={`M ${21 * S} ${HOOP.y * S} A ${4 * S} ${4 * S} 0 0 0 ${29 * S} ${HOOP.y * S}`} />
        <line x1={22 * S} y1={4 * S} x2={28 * S} y2={4 * S} strokeWidth={3} />
        <circle cx={HOOP.x * S} cy={HOOP.y * S} r={0.75 * S} stroke="rgb(249 115 22)" strokeWidth={3} />
        {/* Half court circle */}
        <path d={`M ${19 * S} ${COURT_LENGTH_FT * S} A ${6 * S} ${6 * S} 0 0 1 ${31 * S} ${COURT_LENGTH_FT * S}`} />
      </g>

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
