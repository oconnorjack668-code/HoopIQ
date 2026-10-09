import { describe, it, expect } from 'vitest';
import { cropRectFor, ballCentreInFrame, magnification, CROP_CANVAS_PX, MIN_CROP_PX } from '@/lib/video/crop';
import { rimFromEdges } from '@/lib/video/shotDetector';

// The clip that exposed the problem
const VW = 2561;
const VH = 1184;

describe('cropRectFor', () => {
  it('keeps the crop square so the ball is not stretched', () => {
    const rim = { x: 0.5, y: 0.3, width: 0.05 };
    const c = cropRectFor(rim, VW, VH);
    expect(c.side).toBeGreaterThan(0);
    // side is used for both axes by construction; assert it fits both
    expect(c.side).toBeLessThanOrEqual(Math.min(VW, VH));
  });

  it('centres on the rim when there is room', () => {
    const rim = { x: 0.5, y: 0.5, width: 0.05 };
    const c = cropRectFor(rim, VW, VH);
    expect(c.sx + c.side / 2).toBeCloseTo(rim.x * VW, 0);
    expect(c.sy + c.side / 2).toBeCloseTo(rim.y * VH, 0);
  });

  it('always contains the rim, however the crop is clamped', () => {
    // The invariant that actually matters: wherever the hoop is, it is in frame
    // for the model. Exact centring is impossible near an edge.
    for (const x of [0.01, 0.2, 0.5, 0.8, 0.99]) {
      for (const y of [0.02, 0.3, 0.5, 0.95]) {
        for (const width of [0.004, 0.05, 0.2]) {
          const c = cropRectFor({ x, y, width }, VW, VH);
          const rimPxX = x * VW;
          const rimPxY = y * VH;
          expect(rimPxX, `rim x=${x} left of crop`).toBeGreaterThanOrEqual(c.sx);
          expect(rimPxX, `rim x=${x} right of crop`).toBeLessThanOrEqual(c.sx + c.side);
          expect(rimPxY, `rim y=${y} above crop`).toBeGreaterThanOrEqual(c.sy);
          expect(rimPxY, `rim y=${y} below crop`).toBeLessThanOrEqual(c.sy + c.side);
        }
      }
    }
  });

  it('stays inside the frame for a hoop at the left edge', () => {
    const c = cropRectFor({ x: 0.01, y: 0.25, width: 0.05 }, VW, VH);
    expect(c.sx).toBe(0);
    expect(c.sx + c.side).toBeLessThanOrEqual(VW);
  });

  it('stays inside the frame for a hoop at the right edge', () => {
    const c = cropRectFor({ x: 0.99, y: 0.25, width: 0.05 }, VW, VH);
    expect(c.sx).toBeGreaterThanOrEqual(0);
    expect(c.sx + c.side).toBeLessThanOrEqual(VW);
  });

  it('stays inside the frame for a hoop near the top', () => {
    const c = cropRectFor({ x: 0.5, y: 0.02, width: 0.05 }, VW, VH);
    expect(c.sy).toBe(0);
    expect(c.sy + c.side).toBeLessThanOrEqual(VH);
  });

  it('does not shrink below the floor for a distant hoop', () => {
    // A tiny rim would otherwise produce a crop of a few dozen pixels
    const c = cropRectFor({ x: 0.5, y: 0.3, width: 0.004 }, VW, VH);
    expect(c.side).toBe(MIN_CROP_PX);
  });

  it('never exceeds the shorter side of the frame', () => {
    const c = cropRectFor({ x: 0.5, y: 0.5, width: 0.5 }, VW, VH);
    expect(c.side).toBeLessThanOrEqual(VH);
  });
});

describe('magnification', () => {
  it('makes the ball far bigger to the model on the clip that failed', () => {
    // Rim measured at 5% of a 2561px frame
    const crop = cropRectFor({ x: 0.5, y: 0.3, width: 0.05 }, VW, VH);
    const gain = magnification(crop, VW);
    expect(gain).toBeGreaterThan(2);
  });

  it('is 1x when the crop is the whole frame width', () => {
    const crop = { sx: 0, sy: 0, side: VW };
    expect(magnification(crop, VW)).toBeCloseTo(1);
  });
});

describe('ballCentreInFrame', () => {
  it('maps a detection at the centre of the crop back to the rim', () => {
    // y = 0.5 so the crop is not clamped against the top of the frame
    const rim = { x: 0.5, y: 0.5, width: 0.05 };
    const crop = cropRectFor(rim, VW, VH);
    const half = CROP_CANVAS_PX / 2;
    const centre = ballCentreInFrame({ originX: half - 5, originY: half - 5, width: 10, height: 10 }, crop, VW, VH);
    expect(centre.x).toBeCloseTo(rim.x, 3);
    expect(centre.y).toBeCloseTo(rim.y, 3);
  });

  it('maps the crop corners to the right place in the frame', () => {
    const crop = cropRectFor({ x: 0.5, y: 0.3, width: 0.05 }, VW, VH);
    const topLeft = ballCentreInFrame({ originX: 0, originY: 0, width: 0, height: 0 }, crop, VW, VH);
    expect(topLeft.x).toBeCloseTo(crop.sx / VW, 5);
    expect(topLeft.y).toBeCloseTo(crop.sy / VH, 5);

    const bottomRight = ballCentreInFrame(
      { originX: CROP_CANVAS_PX, originY: CROP_CANVAS_PX, width: 0, height: 0 },
      crop,
      VW,
      VH
    );
    expect(bottomRight.x).toBeCloseTo((crop.sx + crop.side) / VW, 5);
    expect(bottomRight.y).toBeCloseTo((crop.sy + crop.side) / VH, 5);
  });

  it('returns coordinates the shot detector can use, from a measured rim', () => {
    const rim = rimFromEdges({ x: 0.47, y: 0.3 }, { x: 0.53, y: 0.3 });
    const crop = cropRectFor(rim, VW, VH);
    const p = ballCentreInFrame({ originX: 150, originY: 150, width: 20, height: 20 }, crop, VW, VH);
    expect(p.x).toBeGreaterThanOrEqual(0);
    expect(p.x).toBeLessThanOrEqual(1);
    expect(p.y).toBeGreaterThanOrEqual(0);
    expect(p.y).toBeLessThanOrEqual(1);
  });
});
