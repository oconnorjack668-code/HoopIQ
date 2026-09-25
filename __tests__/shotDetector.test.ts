// __tests__/shotDetector.test.ts
import { describe, it, expect } from 'vitest';
import { ShotDetector, type BallObservation } from '@/lib/video/shotDetector';

const RIM = { x: 0.5, y: 0.3, width: 0.06 };

/** A parabolic shot from the shooter's hands to a landing x at rim height, sampled at 30 fps. */
function arc(startT: number, fromX: number, toX: number, peakY = 0.1, frames = 30): BallObservation[] {
  const out: BallObservation[] = [];
  const startY = 0.6;
  for (let i = 0; i <= frames + 6; i++) {
    const p = i / frames; // 0 -> release, 1 -> reaches rim height
    const x = fromX + (toX - fromX) * p;
    // Rise to peakY at p = 0.6, come back down to rim height at p = 1, keep falling after
    const y = p <= 0.6 ? startY - (startY - peakY) * (p / 0.6) ** 0.8 : peakY + (RIM.y - peakY) * ((p - 0.6) / 0.4) ** 1.6;
    out.push({ t: startT + i * 33, ball: { x, y } });
  }
  return out;
}

function run(observations: BallObservation[]) {
  const d = new ShotDetector(RIM);
  for (const o of observations) d.push(o);
  return d.shots;
}

describe('ShotDetector', () => {
  it('counts a ball dropping through the rim as a make', () => {
    const shots = run(arc(0, 0.2, 0.5));
    expect(shots).toHaveLength(1);
    expect(shots[0].made).toBe(true);
    expect(shots[0].confident).toBe(true);
  });

  it('counts a ball coming down beside the rim as a miss', () => {
    const shots = run(arc(0, 0.2, 0.58));
    expect(shots).toHaveLength(1);
    expect(shots[0].made).toBe(false);
  });

  it('counts an airball that never reaches the rim area as a miss', () => {
    const shots = run(arc(0, 0.2, 0.44, 0.2, 30).map((o) => (o.t > 700 ? { ...o, ball: null } : o)).concat([{ t: 3000, ball: null }]));
    expect(shots).toHaveLength(1);
    expect(shots[0].made).toBe(false);
    expect(shots[0].confident).toBe(false);
  });

  it('counts several shots in a row and ignores rim bounces right after a decision', () => {
    const first = arc(0, 0.2, 0.5);
    const bounce: BallObservation[] = [
      { t: 1300, ball: { x: 0.52, y: 0.25 } },
      { t: 1333, ball: { x: 0.52, y: 0.32 } },
    ];
    const second = arc(4000, 0.8, 0.58);
    const third = arc(8000, 0.3, 0.49);
    const shots = run([...first, ...bounce, ...second, ...third]);
    expect(shots.map((s) => s.made)).toEqual([true, false, true]);
  });

  it('ignores the ball when it is nowhere near the hoop (dribbling, passing)', () => {
    const dribbling: BallObservation[] = Array.from({ length: 90 }, (_, i) => ({
      t: i * 33,
      ball: { x: 0.1 + (i % 10) * 0.01, y: 0.7 + (i % 2) * 0.1 },
    }));
    expect(run(dribbling)).toHaveLength(0);
  });
});
