// __tests__/units.test.ts
import { describe, it, expect } from 'vitest';
import {
  cmToFeetInches,
  feetInchesToCm,
  formatHeight,
  displayWeight,
  inputWeightToKg,
  asMeasurementSystem,
} from '@/lib/units';

describe('units', () => {
  it('converts heights both ways', () => {
    expect(feetInchesToCm(6, 1)).toBe(185);
    expect(cmToFeetInches(185)).toEqual({ feet: 6, inches: 1 });
    expect(cmToFeetInches(180)).toEqual({ feet: 5, inches: 11 });
    // 71.65 in rounds up to 72 in: must carry into feet, not show 5' 12"
    expect(cmToFeetInches(182.9)).toEqual({ feet: 6, inches: 0 });
  });

  it('formats height for each system', () => {
    expect(formatHeight(185, 'imperial')).toBe(`6' 1"`);
    expect(formatHeight(185, 'metric')).toBe('185 cm');
    expect(formatHeight(null, 'metric')).toBeNull();
  });

  it('round-trips weights through kg storage', () => {
    const kg = inputWeightToKg(225, 'imperial');
    expect(kg).toBeCloseTo(102.06, 2);
    expect(displayWeight(kg, 'imperial')).toBe(225);
    expect(inputWeightToKg(100, 'metric')).toBe(100);
    expect(displayWeight(100, 'metric')).toBe(100);
  });

  it('defaults unknown preferences to imperial', () => {
    expect(asMeasurementSystem('metric')).toBe('metric');
    expect(asMeasurementSystem(null)).toBe('imperial');
    expect(asMeasurementSystem('furlongs')).toBe('imperial');
  });
});
