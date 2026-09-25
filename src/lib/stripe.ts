// src/lib/stripe.ts
// SERVER-ONLY: Stripe for the HoopIQ Pro subscription. Everything is off until
// STRIPE_SECRET_KEY and a price id are set in the environment.
import Stripe from 'stripe';

export function stripeConfigured(): boolean {
  return !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRO_MONTHLY_PRICE_ID);
}

let client: Stripe | null = null;
export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is not set');
  return (client ??= new Stripe(process.env.STRIPE_SECRET_KEY));
}

export function priceIdFor(interval: 'month' | 'year'): string | null {
  return interval === 'year' ? process.env.STRIPE_PRO_YEARLY_PRICE_ID || null : process.env.STRIPE_PRO_MONTHLY_PRICE_ID || null;
}

type OurStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete';

/** Maps a Stripe subscription status onto the subscriptions.status CHECK values. */
export function mapStatus(status: string): OurStatus {
  switch (status) {
    case 'active':
    case 'trialing':
    case 'past_due':
    case 'incomplete':
      return status;
    case 'unpaid':
      return 'past_due';
    default:
      return 'canceled'; // canceled, incomplete_expired, paused
  }
}

/** Pro while the subscription is paid up (or in a trial / short grace period). */
export function planFor(status: string): 'pro' | 'free' {
  return status === 'active' || status === 'trialing' || status === 'past_due' ? 'pro' : 'free';
}
