// src/lib/auth.ts
// Each helper is wrapped in React cache(), so a page that calls them from the
// layout, the page and several helpers only does the work once per request.
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from './supabase/server';
import type { Database } from './supabase/types';

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Subscription = Database['public']['Tables']['subscriptions']['Row'];
export type AuthUser = { id: string; email: string | null };

/**
 * Retrieves the current authenticated user on the server. Returns null if unauthenticated.
 * getClaims() verifies the session JWT locally when the project uses asymmetric signing
 * keys (no network round trip), and falls back to asking Supabase Auth otherwise.
 */
export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (error || !claims?.sub) {
    return null;
  }

  return { id: claims.sub, email: typeof claims.email === 'string' ? claims.email : null };
});

/**
 * Requires user to be authenticated. Redirects to /login if not.
 */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }
  return user;
}

/**
 * Fetches the player's full profile from the profiles table.
 */
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  return profile;
});

/**
 * Server check for owner entitlement.
 * Evaluates both the configured OWNER_EMAIL environment variable and database roles.
 */
export const checkIsOwner = cache(async (): Promise<boolean> => {
  const user = await getCurrentUser();
  if (!user || !user.email) return false;

  const ownerEmail = process.env.OWNER_EMAIL?.toLowerCase().trim();
  if (ownerEmail && user.email.toLowerCase().trim() === ownerEmail) {
    return true;
  }

  const supabase = await createClient();
  const { data: roles } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'owner')
    .maybeSingle();

  return !!roles;
});

/**
 * Retrieves the player's subscription status and available credits.
 */
export const getCurrentSubscription = cache(async (): Promise<Subscription | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  const isOwner = await checkIsOwner();

  // If user is owner, they always have owner entitlement
  if (isOwner) {
    return {
      id: 'owner-entitlement',
      user_id: user.id,
      stripe_customer_id: null,
      stripe_subscription_id: null,
      plan_type: 'owner',
      status: 'active',
      current_period_start: null,
      current_period_end: null,
      video_credits_remaining: 9999,
      ai_credits_remaining: 9999,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  const supabase = await createClient();
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  return subscription;
});
