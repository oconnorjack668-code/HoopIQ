// __tests__/video-extras.test.ts
import { describe, it, expect } from 'vitest';
import { highlightWindows, pickRecordingType, reelLengthMs } from '@/lib/video/highlights';
import { detectJump, flightSeconds, jumpHeightCm, plausibleFlight, type FootSample } from '@/lib/video/jump';

describe('highlight windows', () => {
  it('cuts around each make and merges close makes', () => {
    const w = highlightWindows([10_000, 12_000, 40_000], { beforeMs: 3000, afterMs: 1500 });
    expect(w).toEqual([
      { startMs: 7000, endMs: 13_500, makes: 2 },
      { startMs: 37_000, endMs: 41_500, makes: 1 },
    ]);
    expect(reelLengthMs(w)).toBe(11_000);
  });

  it('clamps to the video and caps the number of makes', () => {
    const w = highlightWindows([1000, 59_500], { durationMs: 60_000 });
    expect(w[0].startMs).toBe(0);
    expect(w[1].endMs).toBe(60_000);
    expect(highlightWindows(Array.from({ length: 50 }, (_, i) => i * 10_000), { maxMakes: 20 })).toHaveLength(20);
  });

  it('prefers MP4, falls back to WebM, or none', () => {
    expect(pickRecordingType((t) => t.startsWith('video/webm'))).toEqual({ mimeType: 'video/webm;codecs=vp9', extension: 'webm' });
    expect(pickRecordingType((t) => t === 'video/mp4')).toEqual({ mimeType: 'video/mp4', extension: 'mp4' });
    expect(pickRecordingType(() => false)).toBeNull();
  });
});

describe('jump test', () => {
  it('turns flight time into height', () => {
    expect(jumpHeightCm(0.5)).toBeCloseTo(30.7, 1); // 9.81 × 0.25 / 8 = 0.3066 m
    expect(jumpHeightCm(0.6)).toBeCloseTo(44.1, 1);
  });

  it('corrects for slow-motion video', () => {
    expect(flightSeconds(2.0, 6.0, 8)).toBe(0.5);
    expect(flightSeconds(1.0, 1.5)).toBe(0.5);
    expect(plausibleFlight(0.5)).toBe(true);
    expect(plausibleFlight(0.05)).toBe(false);
    expect(plausibleFlight(2)).toBe(false);
  });

  it('finds takeoff and landing from ankle movement', () => {
    // 60 samples per second: standing, 0.55 s in the air, standing again
    const samples: FootSample[] = [];
    for (let i = 0; i < 150; i++) {
      const t = i / 60;
      const inAir = t >= 1.0 && t < 1.55;
      const lift = inAir ? Math.sin(((t - 1.0) / 0.55) * Math.PI) * 0.12 + 0.03 : 0;
      samples.push({ t, footY: 0.9 - lift + (i % 3) * 0.001, hipY: 0.5 - lift });
    }
    const jump = detectJump(samples)!;
    expect(jump.takeoff).toBeCloseTo(1.0, 1);
    expect(jump.landing).toBeCloseTo(1.55, 1);
    expect(jumpHeightCm(jump.landing - jump.takeoff)).toBeGreaterThan(30);
  });

  it('returns null when the player never leaves the ground', () => {
    const still = Array.from({ length: 60 }, (_, i) => ({ t: i / 30, footY: 0.9, hipY: 0.5 }));
    expect(detectJump(still)).toBeNull();
  });
});
