// src/app/api/push/test/route.ts
// Sends a test notification to all of the player's devices.
import { getCurrentUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { pushConfigured, sendPush } from '@/lib/push';

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: 'Please log in again.' }, { status: 401 });
  if (!pushConfigured()) return Response.json({ error: 'Notifications are not set up on the server yet (VAPID keys missing).' }, { status: 503 });

  const supabase = (await createClient()) as any;
  const { data: subs } = await supabase.from('push_subscriptions').select('endpoint, p256dh, auth').eq('user_id', user.id);
  if (!subs?.length) return Response.json({ error: 'No devices are set up for notifications.' }, { status: 404 });

  let sent = 0;
  for (const s of subs) {
    const result = await sendPush(s, { title: 'HoopIQ reminders are on 🏀', body: 'This is how your training reminders will look.', url: '/dashboard' });
    if (result === 'sent') sent++;
    if (result === 'gone') await supabase.from('push_subscriptions').delete().eq('endpoint', s.endpoint);
  }
  return sent ? Response.json({ sent }) : Response.json({ error: 'Could not reach your device. Try turning reminders off and on again.' }, { status: 502 });
}
