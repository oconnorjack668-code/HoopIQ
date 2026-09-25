// __tests__/court.test.ts
import { describe, it, expect } from 'vitest';
import { classifyZone, ZONE_SPOTS } from '@/lib/court';

describe('classifyZone', () => {
  it('finds the paint and free throw area', () => {
    expect(classifyZone(25, 6)).toBe('paint');
    expect(classifyZone(20, 15)).toBe('paint');
    expect(classifyZone(25, 21)).toBe('free-throw');
  });

  it('separates corner threes from baseline mid-range', () => {
    expect(classifyZone(1.5, 5)).toBe('three-left-corner');
    expect(classifyZone(48.5, 5)).toBe('three-right-corner');
    expect(classifyZone(8, 5)).toBe('mid-left-corner');
    expect(classifyZone(42, 5)).toBe('mid-right-corner');
  });

  it('splits wings and top by angle, inside and outside the arc', () => {
    expect(classifyZone(25, 26)).toBe('mid-center');
    expect(classifyZone(10, 18)).toBe('mid-left-wing');
    expect(classifyZone(40, 18)).toBe('mid-right-wing');
    expect(classifyZone(25, 30.5)).toBe('three-top');
    expect(classifyZone(7, 22)).toBe('three-left-wing');
    expect(classifyZone(43, 22)).toBe('three-right-wing');
  });

  it('marks shots from 28+ ft as deep threes', () => {
    expect(classifyZone(25, 35)).toBe('deep-three');
  });

  it('keeps every representative spot inside its own zone', () => {
    for (const [zone, spot] of Object.entries(ZONE_SPOTS)) {
      expect(classifyZone(spot.x, spot.y)).toBe(zone);
    }
  });
});
