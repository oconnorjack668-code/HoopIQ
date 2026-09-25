// src/app/api/ai-coach/chat/route.ts
// AI Coach chat: answers questions using the player's own training data.
// Pro/owner: unlimited. Free: FREE_CHAT_PER_DAY messages per day (no credits used).
// Messages are stored by the server (players can read/clear but not write them).
import { getCurrentUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { hasUnlimitedCredits } from '@/lib/ai/service';
import { openAIChat, type ChatMessage } from '@/lib/ai/provider';
import { buildPlayerContext } from '@/lib/ai/context';
import { CHAT_HISTORY_TURNS, COACH_SYSTEM_PROMPT, FREE_CHAT_PER_DAY, MAX_CHAT_MESSAGE, todayStartIso } from '@/lib/ai/chat';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: 'Please log in again.' }, { status: 401 });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return Response.json({ error: 'AI Coach is not configured (OPENAI_API_KEY is missing).' }, { status: 503 });
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return Response.json({ error: 'AI Coach is not configured (SUPABASE_SERVICE_ROLE_KEY is missing).' }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as { message?: unknown } | null;
  const message = typeof body?.message === 'string' ? body.message.trim() : '';
  if (!message) return Response.json({ error: 'Type a question first.' }, { status: 400 });
  if (message.length > MAX_CHAT_MESSAGE) {
    return Response.json({ error: `Keep questions under ${MAX_CHAT_MESSAGE} characters.` }, { status: 400 });
  }

  const supabase = (await createClient()) as any;
  const [{ data: sub }, { count: usedToday }, { data: history, error: historyError }] = await Promise.all([
    supabase.from('subscriptions').select('plan_type').eq('user_id', user.id).maybeSingle(),
    supabase
      .from('coach_messages')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('role', 'user')
      .gte('created_at', todayStartIso()),
    supabase
      .from('coach_messages')
      .select('role, content')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(CHAT_HISTORY_TURNS),
  ]);
  if (historyError) {
    return Response.json({ error: 'Coach chat isn’t switched on yet (run migration 00021 in Supabase).' }, { status: 503 });
  }

  const unlimited = await hasUnlimitedCredits(sub?.plan_type);
  const used = usedToday || 0;
  if (!unlimited && used >= FREE_CHAT_PER_DAY) {
    return Response.json(
      { error: `You've used your ${FREE_CHAT_PER_DAY} free questions today. Come back tomorrow, or get unlimited chat with HoopIQ Pro.`, limit: true },
      { status: 402 }
    );
  }

  const context = await buildPlayerContext(supabase, user.id);
  const messages: ChatMessage[] = [
    { role: 'system', content: `${COACH_SYSTEM_PROMPT}\n\nToday is ${new Date().toISOString().slice(0, 10)}.\n\nPLAYER DATA:\n${context.text}` },
    ...((history || []) as ChatMessage[]).reverse(),
    { role: 'user', content: message },
  ];

  let reply: string;
  try {
    reply = await openAIChat(messages, { apiKey, model: process.env.AI_MODEL || 'gpt-4o-mini', maxTokens: 700 });
  } catch (err) {
    console.error('Coach chat failed:', err);
    return Response.json({ error: 'The coach is unavailable right now. Please try again in a minute.' }, { status: 502 });
  }

  const admin = createAdminClient() as any;
  const at = Date.now();
  await admin.from('coach_messages').insert([
    { user_id: user.id, role: 'user', content: message, created_at: new Date(at).toISOString() },
    // 1 ms later so the pair always sorts in order
    { user_id: user.id, role: 'assistant', content: reply.slice(0, 4000), created_at: new Date(at + 1).toISOString() },
  ]);

  return Response.json({
    reply,
    remaining: unlimited ? null : Math.max(0, FREE_CHAT_PER_DAY - used - 1),
  });
}
