// src/app/api/billing/portal/route.ts
// Opens Stripe's billing portal so a Pro member can update payment details or cancel.
import { getCurrentUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { getStripe, stripeConfigured } from '@/lib/stripe';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: 'Please log in again.' }, { status: 401 });
  if (!stripeConfigured()) return Response.json({ error: 'Payments are not set up yet.' }, { status: 503 });

  const { data: sub } = await (createAdminClient() as any)
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!sub?.stripe_customer_id) return Response.json({ error: 'No subscription found.' }, { status: 404 });

  const session = await getStripe().billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: `${new URL(request.url).origin}/pro`,
  });
  return Response.json({ url: session.url });
}
