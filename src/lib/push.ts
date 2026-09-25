// src/lib/push.ts
// SERVER-ONLY: sends web push notifications with the VAPID keys from the environment.
import webpush from 'web-push';

export function pushConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

let configured = false;
function configure() {
  if (configured) return;
  webpush.setVapidDetails(
    `mailto:${process.env.SUPPORT_EMAIL || process.env.OWNER_EMAIL || 'support@example.com'}`,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  configured = true;
}

export interface PushTarget {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** Sends one notification. Returns 'gone' when the device unsubscribed (the row should be deleted). */
export async function sendPush(target: PushTarget, payload: { title: string; body: string; url?: string }): Promise<'sent' | 'gone' | 'failed'> {
  configure();
  try {
    await webpush.sendNotification(
      { endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } },
      JSON.stringify(payload),
      { TTL: 60 * 60 * 6 }
    );
    return 'sent';
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode;
    return status === 404 || status === 410 ? 'gone' : 'failed';
  }
}
