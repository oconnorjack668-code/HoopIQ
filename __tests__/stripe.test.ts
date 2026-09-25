// __tests__/stripe.test.ts
import { describe, it, expect } from 'vitest';
import { mapStatus, planFor } from '@/lib/stripe';

describe('stripe status mapping', () => {
  it('maps every Stripe status onto our allowed values', () => {
    const allowed = ['active', 'trialing', 'past_due', 'canceled', 'incomplete'];
    for (const s of ['active', 'trialing', 'past_due', 'incomplete', 'incomplete_expired', 'unpaid', 'canceled', 'paused']) {
      expect(allowed).toContain(mapStatus(s));
    }
    expect(mapStatus('unpaid')).toBe('past_due');
    expect(mapStatus('incomplete_expired')).toBe('canceled');
  });

  it('gives Pro only while the subscription is paid up or in grace', () => {
    expect(planFor('active')).toBe('pro');
    expect(planFor('trialing')).toBe('pro');
    expect(planFor('past_due')).toBe('pro');
    expect(planFor('canceled')).toBe('free');
    expect(planFor('incomplete')).toBe('free');
  });
});
