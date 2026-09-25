// src/lib/units.ts
// Everything is stored in metric (height_cm, weight_kg); these convert for display and input
// using the player's profiles.measurement_system preference.
export type MeasurementSystem = 'imperial' | 'metric';

const CM_PER_INCH = 2.54;
const LB_PER_KG = 2.2046226218;

export function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalInches = Math.round(cm / CM_PER_INCH);
  return { feet: Math.floor(totalInches / 12), inches: totalInches % 12 };
}

export function feetInchesToCm(feet: number, inches: number): number {
  return Math.round((feet * 12 + inches) * CM_PER_INCH);
}

export function kgToLb(kg: number): number {
  return Math.round(kg * LB_PER_KG * 10) / 10;
}

export function lbToKg(lb: number): number {
  return Math.round((lb / LB_PER_KG) * 100) / 100;
}

export function formatHeight(cm: number | null | undefined, system: MeasurementSystem): string | null {
  if (!cm) return null;
  if (system === 'metric') return `${cm} cm`;
  const { feet, inches } = cmToFeetInches(cm);
  return `${feet}' ${inches}"`;
}

export function weightUnitLabel(system: MeasurementSystem): 'lbs' | 'kg' {
  return system === 'metric' ? 'kg' : 'lbs';
}

/** Converts a stored kg value to the player's unit for display. */
export function displayWeight(kg: number, system: MeasurementSystem): number {
  return system === 'metric' ? kg : kgToLb(kg);
}

/** Converts a weight the player typed (in their unit) to kg for storage. */
export function inputWeightToKg(value: number, system: MeasurementSystem): number {
  return system === 'metric' ? value : lbToKg(value);
}

export function asMeasurementSystem(value: unknown): MeasurementSystem {
  return value === 'metric' ? 'metric' : 'imperial';
}
