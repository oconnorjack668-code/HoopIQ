// src/app/api/billing/checkout/route.ts
// Starts a Stripe Checkout for HoopIQ Pro (monthly or yearly).
import { getCurrentUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { getStripe, priceIdFor, stripeConfigured } from '@/lib/stripe';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: 'Please log in again.' }, { status: 401 });
  if (!stripeConfigured()) return Response.json({ error: 'Payments are not set up yet.' }, { status: 503 });

  const body = (await request.json().catch(() => null)) as { interval?: string } | null;
  const interval = body?.interval === 'year' ? 'year' : 'month';
  const price = priceIdFor(interval);
  if (!price) return Response.json({ error: `The ${interval}ly plan is not available.` }, { status: 400 });

  const stripe = getStripe();
  const admin = createAdminClient() as any;
  const { data: sub } = await admin.from('subscriptions').select('stripe_customer_id, plan_type').eq('user_id', user.id).maybeSingle();
  if (sub?.plan_type === 'pro' || sub?.plan_type === 'owner') {
    return Response.json({ error: 'You already have Pro.' }, { status: 409 });
  }

  // One Stripe customer per player, remembered on their subscription row
  let customerId: string | null = sub?.stripe_customer_id || null;
  if (!customerId) {
    const customer = await stripe.customers.create({ email: user.email || undefined, metadata: { user_id: user.id } });
    customerId = customer.id;
    await admin.from('subscriptions').update({ stripe_customer_id: customerId }).eq('user_id', user.id);
  }

  const origin = new URL(request.url).origin;
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    client_reference_id: user.id,
    line_items: [{ price, quantity: 1 }],
    subscription_data: { metadata: { user_id: user.id } },
    allow_promotion_codes: true,
    success_url: `${origin}/pro?success=1`,
    cancel_url: `${origin}/pro`,
  });
  return Response.json({ url: session.url });
}
