// src/lib/video/mechanics.ts
// Shooting mechanics from MediaPipe pose landmarks (33 points, normalised 0..1, y grows downward).

export interface Point {
  x: number;
  y: number;
  visibility?: number;
}

export interface PoseFrame {
  t: number; // ms
  landmarks: Point[]; // MediaPipe pose landmark order
}

export const LM = {
  nose: 0,
  leftShoulder: 11,
  rightShoulder: 12,
  leftElbow: 13,
  rightElbow: 14,
  leftWrist: 15,
  rightWrist: 16,
  leftHip: 23,
  rightHip: 24,
  leftKnee: 25,
  rightKnee: 26,
  leftAnkle: 27,
  rightAnkle: 28,
} as const;

export interface ShotMechanics {
  dipFrame: number;
  setPointFrame: number;
  releaseFrame: number;
  landingFrame: number | null;
  kneeBendDeg: number; // how far the knees bend at the dip (180 = straight legs)
  elbowAngleAtSetPointDeg: number;
  releaseAngleDeg: number; // forearm angle above horizontal at release
  releaseTimeMs: number; // dip to release
  jumpHeightCm: number | null; // estimate, needs the player's height
  landingBalancePct: number | null; // 100 = both feet land level
}

/** Angle ABC in degrees. */
export function angleAt(a: Point, b: Point, c: Point): number {
  const v1 = { x: a.x - b.x, y: a.y - b.y };
  const v2 = { x: c.x - b.x, y: c.y - b.y };
  const dot = v1.x * v2.x + v1.y * v2.y;
  const mag = Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y);
  if (mag === 0) return 0;
  return (Math.acos(Math.min(1, Math.max(-1, dot / mag))) * 180) / Math.PI;
}

const mid = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const round1 = (n: number) => Math.round(n * 10) / 10;

export function analyzeShot(frames: PoseFrame[], shootingHand: 'right' | 'left', playerHeightCm: number | null): ShotMechanics | null {
  if (frames.length < 5) return null;
  const s = shootingHand === 'right'
    ? { shoulder: LM.rightShoulder, elbow: LM.rightElbow, wrist: LM.rightWrist }
    : { shoulder: LM.leftShoulder, elbow: LM.leftElbow, wrist: LM.leftWrist };

  const knee = (f: PoseFrame) => {
    const l = f.landmarks;
    const left = angleAt(l[LM.leftHip], l[LM.leftKnee], l[LM.leftAnkle]);
    const right = angleAt(l[LM.rightHip], l[LM.rightKnee], l[LM.rightAnkle]);
    return (left + right) / 2;
  };

  // Release: the shooting wrist at its highest point
  let releaseFrame = 0;
  frames.forEach((f, i) => {
    if (f.landmarks[s.wrist].y < frames[releaseFrame].landmarks[s.wrist].y) releaseFrame = i;
  });

  // Dip: deepest knee bend before the release
  let dipFrame = 0;
  for (let i = 0; i <= releaseFrame; i++) if (knee(frames[i]) < knee(frames[dipFrame])) dipFrame = i;

  // Set point: first frame after the dip with the wrist above the shoulder
  let setPointFrame = releaseFrame;
  for (let i = dipFrame; i <= releaseFrame; i++) {
    if (frames[i].landmarks[s.wrist].y < frames[i].landmarks[s.shoulder].y) {
      setPointFrame = i;
      break;
    }
  }

  const rel = frames[releaseFrame].landmarks;
  const forearm = { x: rel[s.wrist].x - rel[s.elbow].x, y: rel[s.elbow].y - rel[s.wrist].y };
  const releaseAngleDeg = (Math.atan2(forearm.y, Math.abs(forearm.x)) * 180) / Math.PI;

  const setLm = frames[setPointFrame].landmarks;
  const elbowAngleAtSetPointDeg = angleAt(setLm[s.shoulder], setLm[s.elbow], setLm[s.wrist]);

  // Jump height: rise of the hips from standing, scaled by the player's height
  let jumpHeightCm: number | null = null;
  let landingFrame: number | null = null;
  let landingBalancePct: number | null = null;
  const standing = frames[0].landmarks;
  const hipY = (f: PoseFrame) => mid(f.landmarks[LM.leftHip], f.landmarks[LM.rightHip]).y;
  const ankleY = (f: PoseFrame) => mid(f.landmarks[LM.leftAnkle], f.landmarks[LM.rightAnkle]).y;
  const bodyLength = mid(standing[LM.leftAnkle], standing[LM.rightAnkle]).y - standing[LM.nose].y;

  if (bodyLength > 0.05) {
    let peak = releaseFrame;
    for (let i = dipFrame; i < frames.length; i++) if (hipY(frames[i]) < hipY(frames[peak])) peak = i;
    const rise = hipY(frames[0]) - hipY(frames[peak]);
    if (playerHeightCm) {
      // Nose-to-ankle is roughly 87% of standing height
      jumpHeightCm = round1(Math.max(0, (rise / bodyLength) * playerHeightCm * 0.87));
    }

    // Landing: first frame after the peak with the feet back at standing level
    const groundY = ankleY(frames[0]);
    for (let i = peak + 1; i < frames.length; i++) {
      if (ankleY(frames[i]) >= groundY - bodyLength * 0.02) {
        landingFrame = i;
        const l = frames[i].landmarks;
        const unevenness = Math.abs(l[LM.leftAnkle].y - l[LM.rightAnkle].y) / bodyLength;
        landingBalancePct = Math.round(Math.max(0, 100 - unevenness * 1000));
        break;
      }
    }
  }

  return {
    dipFrame,
    setPointFrame,
    releaseFrame,
    landingFrame,
    kneeBendDeg: Math.round(180 - knee(frames[dipFrame])),
    elbowAngleAtSetPointDeg: Math.round(elbowAngleAtSetPointDeg),
    releaseAngleDeg: Math.round(releaseAngleDeg),
    releaseTimeMs: Math.round(frames[releaseFrame].t - frames[dipFrame].t),
    jumpHeightCm,
    landingBalancePct,
  };
}
