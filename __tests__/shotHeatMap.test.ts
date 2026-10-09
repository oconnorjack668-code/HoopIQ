import { describe, it, expect } from 'vitest';
import { blobRadiusFt, MIN_RADIUS_FT, MAX_RADIUS_FT, PAD_X_FT, PAD_TOP_FT } from '@/components/basketball/ShotHeatMap';
import { COURT_WIDTH_FT, COURT_LENGTH_FT, ZONE_SPOTS, type CourtZone } from '@/lib/court';

const zones = Object.keys(ZONE_SPOTS) as CourtZone[];

// The viewBox the chart draws into, in feet
const LEFT = -PAD_X_FT;
const RIGHT = COURT_WIDTH_FT + PAD_X_FT;
const TOP = -PAD_TOP_FT;
const BOTTOM = COURT_LENGTH_FT;

describe('shot chart geometry', () => {
  it('keeps every zone blob inside the viewBox at its largest', () => {
    // The biggest blob a zone can get is when it holds the most attempts
    for (const zone of zones) {
      const spot = ZONE_SPOTS[zone];
      const r = MAX_RADIUS_FT;
      expect(spot.x - r, `${zone} escapes the left edge`).toBeGreaterThanOrEqual(LEFT);
      expect(spot.x + r, `${zone} escapes the right edge`).toBeLessThanOrEqual(RIGHT);
      expect(spot.y - r, `${zone} escapes the top edge`).toBeGreaterThanOrEqual(TOP);
      expect(spot.y + r, `${zone} escapes the bottom edge`).toBeLessThanOrEqual(BOTTOM);
    }
  });

  it('puts the corner threes fully in frame, which is what clipped before', () => {
    for (const zone of ['three-left-corner', 'three-right-corner'] as const) {
      const spot = ZONE_SPOTS[zone];
      expect(spot.x - MAX_RADIUS_FT).toBeGreaterThanOrEqual(LEFT);
      expect(spot.x + MAX_RADIUS_FT).toBeLessThanOrEqual(RIGHT);
    }
  });

  it('scales the radius between the min and max by volume', () => {
    expect(blobRadiusFt(100, 100)).toBeCloseTo(MAX_RADIUS_FT);
    expect(blobRadiusFt(0, 100)).toBeCloseTo(MIN_RADIUS_FT);
    const mid = blobRadiusFt(25, 100);
    expect(mid).toBeGreaterThan(MIN_RADIUS_FT);
    expect(mid).toBeLessThan(MAX_RADIUS_FT);
  });

  it('never divides by zero when nothing has been tracked', () => {
    expect(blobRadiusFt(0, 0)).toBe(MIN_RADIUS_FT);
    expect(Number.isFinite(blobRadiusFt(5, 0))).toBe(true);
  });

  it('gives a bigger blob to a bigger sample', () => {
    expect(blobRadiusFt(200, 200)).toBeGreaterThan(blobRadiusFt(12, 200));
  });
});
