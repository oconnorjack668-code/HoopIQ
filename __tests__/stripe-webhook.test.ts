// __tests__/stripe-webhook.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const calls: Array<{ update: Record<string, unknown>; filters: string[] }> = [];
let updateError: { message: string } | null = null;

// Chainable stand-in for admin.from('subscriptions').update(...).neq(...).or(...).eq(...)
function builder(update: Record<string, unknown>) {
  const entry = { update, filters: [] as string[] };
  calls.push(entry);
  const chain: any = {
    neq: (c: string, v: string) => (entry.filters.push(`${c}!=${v}`), chain),
    or: (f: string) => (entry.filters.push(`or(${f})`), chain),
    eq: (c: string, v: string) => (entry.filters.push(`${c}=${v}`), chain),
    then: (resolve: (r: unknown) => void) => resolve({ error: updateError }),
  };
  return chain;
}

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ from: () => ({ update: builder }) }),
}));

const retrieve = vi.fn();
let event: any;
vi.mock('@/lib/stripe', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/stripe')>()),
  getStripe: () => ({ webhooks: { constructEvent: () => event }, subscriptions: { retrieve } }),
}));

const sub = (id: string, status: string) => ({
  id,
  status,
  customer: 'cus_1',
  metadata: { user_id: 'user-1' },
  items: { data: [{ current_period_start: 1, current_period_end: 2 }] },
});

async function post() {
  const { POST } = await import('@/app/api/webhooks/stripe/route');
  return POST(new Request('http://x/api/webhooks/stripe', { method: 'POST', body: '{}', headers: { 'stripe-signature': 'sig' } }));
}

describe('Stripe webhook', () => {
  beforeEach(() => {
    calls.length = 0;
    updateError = null;
    retrieve.mockReset();
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
  });

  it('stores the latest subscription state, not the event snapshot', async () => {
    event = { type: 'customer.subscription.updated', data: { object: sub('sub_1', 'canceled') } };
    retrieve.mockResolvedValue(sub('sub_1', 'active'));
    const res = await post();
    expect(res.status).toBe(200);
    expect(retrieve).toHaveBeenCalledWith('sub_1');
    expect(calls[0].update.plan_type).toBe('pro');
    expect(calls[0].filters).toContain('user_id=user-1');
  });

  it('answers 500 when the database update fails so Stripe retries', async () => {
    event = { type: 'customer.subscription.created', data: { object: sub('sub_1', 'active') } };
    retrieve.mockResolvedValue(sub('sub_1', 'active'));
    updateError = { message: 'boom' };
    const res = await post();
    expect(res.status).toBe(500);
  });

  it('an old subscription ending only downgrades the row if it is still that subscription', async () => {
    event = { type: 'customer.subscription.deleted', data: { object: sub('sub_old', 'canceled') } };
    retrieve.mockResolvedValue(sub('sub_old', 'canceled'));
    await post();
    expect(calls[0].update.plan_type).toBe('free');
    expect(calls[0].filters).toContain('or(stripe_subscription_id.is.null,stripe_subscription_id.eq.sub_old)');
  });
});
