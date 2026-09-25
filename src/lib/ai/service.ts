// src/lib/ai/service.ts
// SERVER-ONLY: generates post-session coaching reports and manages AI credits.
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkIsOwner } from '@/lib/auth';
import { getAIProvider, type CoachingEvidence, type CoachingOutput } from './provider';

export const CREDITS_PER_REPORT = 1;
const PROMPT_VERSION = '1.1';

export class AICoachError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export interface GeneratedReport {
  id: string;
  output: CoachingOutput;
}

function aiConfig() {
  const provider = process.env.AI_PROVIDER || 'openai';
  const apiKey = process.env.OPENAI_API_KEY || '';
  if (!apiKey) {
    throw new AICoachError('AI Coach is not configured (OPENAI_API_KEY is missing).', 503);
  }
  return {
    provider,
    config: { apiKey, model: process.env.AI_MODEL || 'gpt-4o-mini', maxTokens: 800 },
  };
}

/** Unlimited for owners (role or OWNER_EMAIL) and pro/owner plans. */
export async function hasUnlimitedCredits(planType: string | undefined): Promise<boolean> {
  return planType === 'pro' || planType === 'owner' || (await checkIsOwner());
}

/**
 * Takes one credit before calling the AI provider. Credits are changed with the
 * service role because players cannot update their own subscription (00007).
 * The update only applies if the balance hasn't changed since it was read, so
 * two simultaneous requests can't both spend the last credit.
 */
function adminClientOrThrow() {
  try {
    return createAdminClient() as any;
  } catch {
    throw new AICoachError('AI Coach is not configured (SUPABASE_SERVICE_ROLE_KEY is missing).', 503);
  }
}

export async function reserveCredit(userId: string): Promise<'unlimited' | 'reserved'> {
  // Players can read their own subscription, so owners/pro never need the service role
  const supabase = (await createClient()) as any;
  const { data: sub, error } = await supabase
    .from('subscriptions')
    .select('plan_type, ai_credits_remaining')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new AICoachError('Could not load your AI credits.', 500);

  if (await hasUnlimitedCredits(sub?.plan_type)) return 'unlimited';

  const remaining: number = sub?.ai_credits_remaining ?? 0;
  if (remaining < CREDITS_PER_REPORT) {
    throw new AICoachError('You have no AI credits left.', 402);
  }

  const admin = adminClientOrThrow();
  const { data: updated, error: updateError } = await admin
    .from('subscriptions')
    .update({ ai_credits_remaining: remaining - CREDITS_PER_REPORT, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('ai_credits_remaining', remaining)
    .select('id');
  if (updateError) throw new AICoachError('Could not use an AI credit.', 500);
  if (!updated || updated.length === 0) {
    throw new AICoachError('Your credits changed while generating. Please try again.', 409);
  }
  return 'reserved';
}

export async function refundCredit(userId: string): Promise<void> {
  const admin = adminClientOrThrow();
  const { data: sub } = await admin
    .from('subscriptions')
    .select('ai_credits_remaining')
    .eq('user_id', userId)
    .maybeSingle();
  if (!sub) return;
  await admin
    .from('subscriptions')
    .update({ ai_credits_remaining: sub.ai_credits_remaining + CREDITS_PER_REPORT, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('ai_credits_remaining', sub.ai_credits_remaining);
}

/** Collects the session, its drills and shots (all RLS-scoped to the player). */
async function buildEvidence(userId: string, sessionId: string): Promise<CoachingEvidence> {
  const supabase = (await createClient()) as any;

  const { data: session } = await supabase
    .from('training_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .maybeSingle();
  if (!session) throw new AICoachError('Session not found.', 404);

  const { data: drills } = await supabase
    .from('session_drills')
    .select('id, drill_name')
    .eq('session_id', sessionId)
    .order('display_order', { ascending: true });

  const drillIds: string[] = (drills || []).map((d: any) => d.id);
  const { data: shots } = drillIds.length
    ? await supabase.from('shooting_entries').select('shot_zone, makes, attempts').in('drill_id', drillIds)
    : { data: [] };

  const zones = new Map<string, { makes: number; attempts: number }>();
  for (const s of shots || []) {
    const z = zones.get(s.shot_zone) || { makes: 0, attempts: 0 };
    z.makes += s.makes;
    z.attempts += s.attempts;
    zones.set(s.shot_zone, z);
  }
  const totalMakes = [...zones.values()].reduce((sum, z) => sum + z.makes, 0);
  const totalAttempts = [...zones.values()].reduce((sum, z) => sum + z.attempts, 0);

  const { data: previous } = await supabase
    .from('ai_reports')
    .select('output_content')
    .eq('user_id', userId)
    .eq('report_type', 'post_session')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    sessionType: session.session_type,
    sessionDate: session.session_date,
    duration: session.duration_minutes,
    intensity: session.intensity_rpe,
    perceivedQuality: session.perceived_quality,
    totalMakes,
    totalAttempts,
    shootingPercentage: totalAttempts > 0 ? (totalMakes / totalAttempts) * 100 : undefined,
    zoneBreakdown: [...zones.entries()].map(([zone, z]) => ({ zone, ...z })),
    drillsCompleted: (drills || []).map((d: any) => d.drill_name),
    playerNotes: session.notes || undefined,
    previousFeedbackSummary: previous?.output_content?.summary,
  };
}

export async function generateSessionReport(userId: string, sessionId: string): Promise<GeneratedReport> {
  const { provider: providerName, config } = aiConfig();
  const provider = getAIProvider(providerName);
  const supabase = (await createClient()) as any;

  const { data: existing } = await supabase
    .from('ai_reports')
    .select('id')
    .eq('user_id', userId)
    .contains('source_session_ids', [sessionId])
    .limit(1);
  if (existing && existing.length > 0) {
    throw new AICoachError('This session already has AI feedback.', 409);
  }

  const evidence = await buildEvidence(userId, sessionId);
  const credit = await reserveCredit(userId);

  let output: CoachingOutput;
  try {
    output = await provider.generateCoachingSummary(evidence, config);
  } catch (err) {
    if (credit === 'reserved') await refundCredit(userId);
    const message = err instanceof Error ? err.message : 'AI request failed';
    throw new AICoachError(message, 502);
  }

  const { data: report, error } = await supabase
    .from('ai_reports')
    .insert({
      user_id: userId,
      report_type: 'post_session',
      input_data: evidence,
      provider: provider.name,
      model: config.model,
      prompt_version: PROMPT_VERSION,
      output_content: output,
      status: 'delivered',
      source_session_ids: [sessionId],
    })
    .select('id')
    .single();

  if (error || !report) {
    if (credit === 'reserved') await refundCredit(userId);
    throw new AICoachError('Could not save the AI feedback.', 500);
  }

  return { id: report.id, output };
}
