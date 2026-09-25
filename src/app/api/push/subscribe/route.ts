// src/app/api/push/subscribe/route.ts
// Saves (POST) or removes (DELETE) this device's push subscription and turns reminders on/off.
import { getCurrentUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: 'Please log in again.' }, { status: 401 });

  const body = (await request.json().catch(() => null)) as {
    subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
    timezone?: string;
  } | null;
  const sub = body?.subscription;
  if (!sub?.endpoint || !/^https:\/\//.test(sub.endpoint) || !sub.keys?.p256dh || !sub.keys?.auth) {
    return Response.json({ error: 'Invalid push subscription.' }, { status: 400 });
  }

  const supabase = (await createClient()) as any;
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: user.id,
      endpoint: sub.endpoint.slice(0, 1000),
      p256dh: sub.keys.p256dh.slice(0, 200),
      auth: sub.keys.auth.slice(0, 200),
      user_agent: (request.headers.get('user-agent') || '').slice(0, 300),
    },
    { onConflict: 'endpoint' }
  );
  if (error) return Response.json({ error: `Could not save this device: ${error.message}` }, { status: 500 });

  const timezone = typeof body?.timezone === 'string' ? body.timezone.slice(0, 64) : null;
  await supabase
    .from('notification_preferences')
    .update({ push_enabled: true, ...(timezone ? { timezone } : {}), updated_at: new Date().toISOString() })
    .eq('user_id', user.id);

  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: 'Please log in again.' }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { endpoint?: string } | null;
  const supabase = (await createClient()) as any;
  if (body?.endpoint) await supabase.from('push_subscriptions').delete().eq('endpoint', body.endpoint);
  const { count } = await supabase.from('push_subscriptions').select('id', { count: 'exact', head: true }).eq('user_id', user.id);
  if (!count) await supabase.from('notification_preferences').update({ push_enabled: false }).eq('user_id', user.id);
  return Response.json({ ok: true });
}
