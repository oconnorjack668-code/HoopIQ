// src/lib/utils.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPercentage(makes: number, attempts: number): string {
  if (attempts <= 0) return '0.0%';
  return `${((makes / attempts) * 100).toFixed(1)}%`;
}

export function calculatePercentageNumber(makes: number, attempts: number): number {
  if (attempts <= 0) return 0;
  return Number(((makes / attempts) * 100).toFixed(1));
}
