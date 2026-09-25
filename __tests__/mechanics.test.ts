// __tests__/mechanics.test.ts
import { describe, it, expect } from 'vitest';
import { analyzeShot, angleAt, LM, type PoseFrame, type Point } from '@/lib/video/mechanics';

/** A simple side-on jump shot: stand, dip, rise with the ball overhead, jump, land. */
function syntheticShot(): PoseFrame[] {
  const frames: PoseFrame[] = [];
  const phases = [
    { knee: 175, wristY: 0.55, hipLift: 0 }, // standing, ball at chest
    { knee: 150, wristY: 0.58, hipLift: 0 },
    { knee: 115, wristY: 0.6, hipLift: 0 }, // dip (deepest)
    { knee: 140, wristY: 0.4, hipLift: 0 }, // ball rising, above shoulder
    { knee: 170, wristY: 0.2, hipLift: 0.02 }, // set point: wrist above the shoulder
    { knee: 178, wristY: 0.12, hipLift: 0.06 }, // release (wrist highest), in the air
    { knee: 178, wristY: 0.14, hipLift: 0.04 },
    { knee: 165, wristY: 0.3, hipLift: 0.0 }, // landing
    { knee: 160, wristY: 0.4, hipLift: 0.0 },
  ];
  phases.forEach((p, i) => {
    const lm: Point[] = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5 }));
    const lift = p.hipLift;
    const hipY = 0.55 - lift;
    const ankleY = 0.95 - lift;
    // Place the knee so hip-knee-ankle makes the requested angle (knee pushed forward)
    const half = ((180 - p.knee) / 2) * (Math.PI / 180);
    const kneeY = (hipY + ankleY) / 2;
    const kneeX = 0.5 + Math.tan(half) * ((ankleY - hipY) / 2);
    for (const [hip, knee, ankle] of [[LM.leftHip, LM.leftKnee, LM.leftAnkle], [LM.rightHip, LM.rightKnee, LM.rightAnkle]]) {
      lm[hip] = { x: 0.5, y: hipY };
      lm[knee] = { x: kneeX, y: kneeY };
      lm[ankle] = { x: 0.5, y: ankleY };
    }
    lm[LM.nose] = { x: 0.5, y: 0.1 - lift };
    lm[LM.rightShoulder] = { x: 0.5, y: 0.25 - lift };
    lm[LM.rightElbow] = { x: 0.55, y: p.wristY + 0.1 };
    lm[LM.rightWrist] = { x: 0.57, y: p.wristY };
    frames.push({ t: i * 100, landmarks: lm });
  });
  return frames;
}

describe('mechanics', () => {
  it('measures angles', () => {
    expect(Math.round(angleAt({ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }))).toBe(90);
    expect(Math.round(angleAt({ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }))).toBe(180);
  });

  it('finds the dip, set point and release and measures the shot', () => {
    const m = analyzeShot(syntheticShot(), 'right', 185)!;
    expect(m.dipFrame).toBe(2);
    expect(m.setPointFrame).toBe(4); // first frame after the dip with the wrist above the shoulder
    expect(m.releaseFrame).toBe(5);
    expect(m.kneeBendDeg).toBeGreaterThan(60);
    expect(m.kneeBendDeg).toBeLessThan(70);
    expect(m.releaseTimeMs).toBe(300);
    expect(m.releaseAngleDeg).toBeGreaterThan(70);
  });

  it('estimates jump height from the player height and finds a level landing', () => {
    const m = analyzeShot(syntheticShot(), 'right', 185)!;
    // 0.06 hip rise over a 0.85 nose-to-ankle body length at 185 cm -> about 11 cm
    expect(m.jumpHeightCm).toBeGreaterThan(9);
    expect(m.jumpHeightCm).toBeLessThan(13);
    expect(m.landingFrame).toBe(7);
    expect(m.landingBalancePct).toBe(100);
  });

  it('returns no jump estimate without a height and nothing for too-short clips', () => {
    expect(analyzeShot(syntheticShot(), 'right', null)!.jumpHeightCm).toBeNull();
    expect(analyzeShot(syntheticShot().slice(0, 3), 'right', 185)).toBeNull();
  });
});
