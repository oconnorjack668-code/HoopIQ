// src/app/api/webhooks/stripe/route.ts
// Stripe webhook: keeps subscriptions.plan_type in sync with the Stripe subscription.
// Verified with STRIPE_WEBHOOK_SECRET (the proxy lets /api/webhooks through without login).
import type Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { getStripe, mapStatus, planFor } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

const toIso = (seconds: number | null | undefined) => (seconds ? new Date(seconds * 1000).toISOString() : null);

async function syncSubscription(subscription: Stripe.Subscription) {
  const admin = createAdminClient() as any;
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
  const userId = subscription.metadata?.user_id;
  const item = subscription.items?.data?.[0];
  const update = {
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    plan_type: planFor(subscription.status),
    status: mapStatus(subscription.status),
    current_period_start: toIso(item?.current_period_start),
    current_period_end: toIso(item?.current_period_end),
    updated_at: new Date().toISOString(),
  };
  // Owners keep owner access whatever Stripe says
  const query = admin.from('subscriptions').update(update).neq('plan_type', 'owner');
  if (userId) await query.eq('user_id', userId);
  else await query.eq('stripe_customer_id', customerId);
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get('stripe-signature');
  if (!secret || !signature) return Response.json({ error: 'Not configured' }, { status: 400 });

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    // Signature verification needs the exact raw body
    event = stripe.webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return Response.json({ error: 'Invalid signature' }, { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.subscription) {
        const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription.id;
        await syncSubscription(await stripe.subscriptions.retrieve(subscriptionId));
      }
      break;
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      await syncSubscription(event.data.object as Stripe.Subscription);
      break;
    default:
      break;
  }
  return Response.json({ received: true });
}
