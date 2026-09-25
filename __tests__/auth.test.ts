// __tests__/auth.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkIsOwner } from '@/lib/auth';

// Mock the Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

describe('Auth & Entitlement Logic', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.OWNER_EMAIL = 'owner@hoopiq.app';
  });

  it('recognizes configured OWNER_EMAIL environment variable', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: {
        getClaims: vi.fn().mockResolvedValue({
          data: { claims: { sub: 'user-123', email: 'owner@hoopiq.app' } },
          error: null,
        }),
      },
    });

    const isOwner = await checkIsOwner();
    expect(isOwner).toBe(true);
  });

  it('denies owner status to non-owner email when database has no owner role', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: {
        getClaims: vi.fn().mockResolvedValue({
          data: { claims: { sub: 'user-456', email: 'player@example.com' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
      }),
    });

    const isOwner = await checkIsOwner();
    expect(isOwner).toBe(false);
  });

  it('returns false when unauthenticated', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: {
        getClaims: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      },
    });

    const isOwner = await checkIsOwner();
    expect(isOwner).toBe(false);
  });
});
