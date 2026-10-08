// src/components/basketball/CourtMarkings.tsx
import React from 'react';
import { COURT_LENGTH_FT, HOOP } from '@/lib/court';

/** SVG units per foot. The hoop is at the top, half court at the bottom. */
export const S = 10;

/**
 * The half-court line work, shared by the shot logger and the heat map so the
 * two always show the same court. Pure markup - no interactivity.
 */
export function CourtMarkings() {
  return (
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
  );
}
