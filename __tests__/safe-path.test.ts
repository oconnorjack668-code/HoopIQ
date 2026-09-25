// __tests__/safe-path.test.ts
import { describe, it, expect } from 'vitest';
import { isSafeAppPath, safeAppPath } from '@/lib/safePath';

describe('safeAppPath (open-redirect guard)', () => {
  it('keeps normal in-app paths', () => {
    expect(safeAppPath('/dashboard')).toBe('/dashboard');
    expect(safeAppPath('/profile')).toBe('/profile');
    expect(safeAppPath('/programs/abc/day/1?x=1#y')).toBe('/programs/abc/day/1?x=1#y');
  });

  it('rejects links to other sites', () => {
    for (const bad of ['//evil.example', '/\\evil.example', 'https://evil.example', 'evil.example', '/\t/evil.example', '/%0A', '\\\\evil.example', '']) {
      const resolved = safeAppPath(bad);
      // Either rejected, or it must stay on our own host when resolved like a browser would
      if (resolved !== '/dashboard') expect(new URL(resolved, 'https://hoopiq.app').host).toBe('hoopiq.app');
    }
    expect(safeAppPath('//evil.example')).toBe('/dashboard');
    expect(safeAppPath('/\\evil.example')).toBe('/dashboard');
    expect(safeAppPath('/\t/evil.example')).toBe('/dashboard');
    expect(safeAppPath(null, '/onboarding')).toBe('/onboarding');
  });

  it('isSafeAppPath is false for missing values', () => {
    expect(isSafeAppPath(null)).toBe(false);
    expect(isSafeAppPath(undefined)).toBe(false);
    expect(isSafeAppPath('/games/new')).toBe(true);
  });
});
