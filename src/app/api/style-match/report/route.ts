// src/app/api/style-match/report/route.ts
// AI coaching report for a saved Play Style Match (owner and Pro plans).
import { getCurrentUser, getCurrentSubscription, getCurrentProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { openAIJson } from '@/lib/ai/provider';
import { formatHeight, asMeasurementSystem } from '@/lib/units';

const SYSTEM_PROMPT = `You are an elite basketball player-development coach. A player has been matched to NBA players
with similar height and play style. Write a practical development plan for this player (aged 13+) based on what
those NBA players do well. Only use the information provided; do not invent statistics or personal details about
anyone. Be specific and encouraging. Respond with a JSON object with these keys:
- "headline": one sentence describing the player's style in basketball terms
- "why_you_match": 2-3 sentences explaining the matches (mention height where relevant)
- "strengths_to_build": array of 3 strengths to develop, each copied from a matched NBA player and adapted to this player
- "moves_to_learn": array of 3 moves, each an object {"move": name, "from": NBA player name, "how": 1-2 sentence practice plan}
- "weekly_plan": array of 3-5 short training priorities for the next 4 weeks
- "watch_for": one sentence on what to study when watching the matched players' games`;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: 'Please log in again.' }, { status: 401 });

  const subscription = await getCurrentSubscription();
  if (subscription?.plan_type !== 'owner' && subscription?.plan_type !== 'pro') {
    return Response.json({ error: 'The AI style report is a Pro feature.' }, { status: 403 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return Response.json({ error: 'AI is not configured (OPENAI_API_KEY is missing).' }, { status: 503 });

  const body = (await request.json().catch(() => null)) as { resultId?: unknown } | null;
  const resultId = typeof body?.resultId === 'string' ? body.resultId : null;
  if (!resultId || !/^[0-9a-f-]{36}$/i.test(resultId)) {
    return Response.json({ error: 'A valid resultId is required.' }, { status: 400 });
  }

  // Row level security makes this return only the player's own result
  const supabase = (await createClient()) as any;
  const { data: result } = await supabase.from('style_match_results').select('id, input, matches').eq('id', resultId).maybeSingle();
  if (!result) return Response.json({ error: 'Match not found.' }, { status: 404 });

  const profile = await getCurrentProfile();
  const units = asMeasurementSystem(profile?.measurement_system);
  const matches = (result.matches || []) as Array<{
    name: string;
    height_cm: number;
    position: string;
    archetype: string;
    score: number;
    strengths: string[];
    signature_moves: string[];
    how_to_copy: string[];
  }>;
  const prompt = [
    `Player: height ${formatHeight(result.input?.heightCm, units)}, position ${result.input?.position || 'not set'}, level ${profile?.playing_level || 'not set'}.`,
    `Their style (self-described): ${(result.input?.styleTagLabels || []).join('; ') || 'not given'}.`,
    result.input?.shotProfile
      ? `Shot locations from logged sessions: ${Math.round(result.input.shotProfile.rim * 100)}% at the rim, ${Math.round(result.input.shotProfile.mid * 100)}% mid-range, ${Math.round(result.input.shotProfile.three * 100)}% threes.`
      : 'Not enough logged shots for a shot profile yet.',
    `Their goals: ${(profile?.goals || []).join(', ') || 'not set'}. Focus areas: ${(profile?.focus_areas || []).join(', ') || 'not set'}.`,
    'Matched NBA players:',
    ...matches.map(
      (m) =>
        `- ${m.name} (${m.position}, ${formatHeight(m.height_cm, units)}, ${m.archetype}, ${m.score}% match). Strengths: ${m.strengths.join(', ')}. Signature moves: ${m.signature_moves.join(', ')}. How to copy: ${m.how_to_copy.join(' ')}`
    ),
  ].join('\n');

  let report: Record<string, unknown>;
  try {
    report = await openAIJson(SYSTEM_PROMPT, prompt, { apiKey, model: process.env.AI_MODEL || 'gpt-4o-mini', maxTokens: 1200 });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'AI request failed' }, { status: 502 });
  }

  // Players can't update saved results directly; the server stores the report
  try {
    await (createAdminClient() as any).from('style_match_results').update({ report }).eq('id', resultId).eq('user_id', user.id);
  } catch {
    // Not fatal: the report is still returned to the player
  }

  return Response.json({ report });
}
