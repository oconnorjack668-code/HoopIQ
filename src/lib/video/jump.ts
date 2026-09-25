// src/lib/video/jump.ts
// Vertical jump from flight time (the method used by sports-science jump apps):
// height = g · t² / 8, where t is the time between the feet leaving and touching the ground.
// It needs no calibration or distance to the camera, only accurate takeoff and landing frames.

const G = 9.81;

export function jumpHeightCm(flightSeconds: number): number {
  return Math.round(((G * flightSeconds * flightSeconds) / 8) * 1000) / 10;
}

/**
 * Flight time in real seconds. Slow-motion phone videos are usually saved slowed down
 * (e.g. 240 fps played at 30 fps = 8x), so video time is divided by that factor.
 */
export function flightSeconds(takeoffVideoS: number, landingVideoS: number, slowMotionFactor = 1): number {
  return Math.max(0, landingVideoS - takeoffVideoS) / Math.max(1, slowMotionFactor);
}

/** Humanly possible flight times: roughly 5 cm to 130 cm jumps */
export function plausibleFlight(seconds: number): boolean {
  return seconds >= 0.2 && seconds <= 1.03;
}

export interface FootSample {
  /** video time in seconds */
  t: number;
  /** average ankle/heel height in the frame (0 = top, 1 = bottom) */
  footY: number;
  /** average hip height in the frame */
  hipY: number;
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/**
 * Finds takeoff and landing in a clip that starts with the player standing still.
 * Airborne = feet clearly above their standing height (a share of leg length, so it
 * works at any distance from the camera). Uses the longest airborne run.
 */
export function detectJump(samples: FootSample[], threshold = 0.08): { takeoff: number; landing: number } | null {
  const valid = samples.filter((s) => Number.isFinite(s.footY) && Number.isFinite(s.hipY)).sort((a, b) => a.t - b.t);
  if (valid.length < 8) return null;

  const standing = valid.slice(0, Math.max(3, Math.floor(valid.length * 0.2)));
  const ground = median(standing.map((s) => s.footY));
  const leg = median(standing.map((s) => s.footY - s.hipY));
  if (!(leg > 0.02)) return null;
  const liftLine = ground - leg * threshold;

  let best: { from: number; to: number } | null = null;
  let runStart = -1;
  for (let i = 0; i <= valid.length; i++) {
    const airborne = i < valid.length && valid[i].footY < liftLine;
    if (airborne && runStart < 0) runStart = i;
    if (!airborne && runStart >= 0) {
      if (!best || i - runStart > best.to - best.from) best = { from: runStart, to: i };
      runStart = -1;
    }
  }
  if (!best || best.to >= valid.length || best.from === 0) return null;

  // Feet left the ground between the last grounded sample and the first airborne one (and vice versa)
  const takeoff = (valid[best.from - 1].t + valid[best.from].t) / 2;
  const landing = (valid[best.to - 1].t + valid[best.to].t) / 2;
  return { takeoff, landing };
}
