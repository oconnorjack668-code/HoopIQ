// __tests__/report-error.test.ts
import { describe, it, expect } from 'vitest';
import { isIgnoredError } from '@/lib/reportError';

describe('crash report filter', () => {
  it('ignores errors injected by in-app browsers and connection drops', () => {
    expect(isIgnoredError("ReferenceError: Can't find variable: SCDynimacBridge")).toBe(true);
    expect(isIgnoredError("ReferenceError: Can't find variable: __gCrWeb")).toBe(true);
    expect(isIgnoredError('TypeError: Failed to fetch')).toBe(true);
    expect(isIgnoredError('ResizeObserver loop completed with undelivered notifications.')).toBe(true);
  });

  it('keeps real HoopIQ errors', () => {
    expect(isIgnoredError("TypeError: Cannot read properties of undefined (reading 'makes')")).toBe(false);
    expect(isIgnoredError("ReferenceError: Can't find variable: shotZones")).toBe(false);
  });
});
