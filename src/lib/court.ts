// src/lib/court.ts
// Half-court geometry (in feet) used by the shot tracker. Origin is the left corner
// of the baseline; y grows toward half court. Standard high-school/college/NBA-style
// markings are approximated with one set of dimensions (50 x 47 ft half court).
import type { ShotZone } from '@/lib/supabase/types';

export const COURT_WIDTH_FT = 50;
export const COURT_LENGTH_FT = 47;
export const HOOP = { x: 25, y: 5.25 };
export const THREE_RADIUS_FT = 23.75;
export const CORNER_THREE_X_FT = 3; // corner 3 line is 3 ft in from the sideline
export const CORNER_DEPTH_FT = 14; // straight corner 3 line runs 14 ft from the baseline
export const PAINT = { left: 17, right: 33, depth: 19 };
export const FT_CIRCLE_RADIUS_FT = 6;
export const DEEP_THREE_FT = 28;
const CENTER_ANGLE_DEG = 22; // within this angle of straight-on counts as "top"/"center"

export type CourtZone = Exclude<ShotZone, 'all-around'>;

/** Classifies a spot on the half court into one of the 13 location zones. */
export function classifyZone(x: number, y: number): CourtZone {
  const dx = x - HOOP.x;
  const dy = y - HOOP.y;
  const distance = Math.hypot(dx, dy);
  const left = x < HOOP.x;
  const angle = Math.abs((Math.atan2(dx, Math.max(dy, 0.001)) * 180) / Math.PI);
  const inCornerStrip = y <= CORNER_DEPTH_FT;

  const isThree = inCornerStrip
    ? x < CORNER_THREE_X_FT || x > COURT_WIDTH_FT - CORNER_THREE_X_FT
    : distance >= THREE_RADIUS_FT;

  if (isThree) {
    if (distance >= DEEP_THREE_FT && !inCornerStrip) return 'deep-three';
    if (inCornerStrip) return left ? 'three-left-corner' : 'three-right-corner';
    if (angle <= CENTER_ANGLE_DEG) return 'three-top';
    return left ? 'three-left-wing' : 'three-right-wing';
  }

  if (x >= PAINT.left && x <= PAINT.right && y <= PAINT.depth) return 'paint';
  if (y > PAINT.depth && Math.hypot(x - HOOP.x, y - PAINT.depth) <= FT_CIRCLE_RADIUS_FT) return 'free-throw';
  if (inCornerStrip) return left ? 'mid-left-corner' : 'mid-right-corner';
  if (angle <= CENTER_ANGLE_DEG) return 'mid-center';
  return left ? 'mid-left-wing' : 'mid-right-wing';
}

export const ZONE_LABELS: Record<ShotZone, string> = {
  paint: 'Paint',
  'free-throw': 'Free throw',
  'mid-left-corner': 'Mid left baseline',
  'mid-left-wing': 'Mid left wing',
  'mid-center': 'Mid top',
  'mid-right-wing': 'Mid right wing',
  'mid-right-corner': 'Mid right baseline',
  'three-left-corner': '3 left corner',
  'three-left-wing': '3 left wing',
  'three-top': '3 top of key',
  'three-right-wing': '3 right wing',
  'three-right-corner': '3 right corner',
  'deep-three': 'Deep 3',
  'all-around': 'All around',
};

/** A representative spot for each zone (feet), used when a zone is picked without tapping. */
export const ZONE_SPOTS: Record<CourtZone, { x: number; y: number }> = {
  paint: { x: 25, y: 9 },
  'free-throw': { x: 25, y: 20 },
  'mid-left-corner': { x: 8, y: 6 },
  'mid-left-wing': { x: 10, y: 17 },
  'mid-center': { x: 25, y: 27 },
  'mid-right-wing': { x: 40, y: 17 },
  'mid-right-corner': { x: 42, y: 6 },
  'three-left-corner': { x: 1.5, y: 6 },
  'three-left-wing': { x: 6, y: 24 },
  'three-top': { x: 25, y: 30.5 },
  'three-right-wing': { x: 44, y: 24 },
  'three-right-corner': { x: 48.5, y: 6 },
  'deep-three': { x: 25, y: 36 },
};
