// Anchor — Web Push Edge Function.
//
// Deploy:
//   supabase functions deploy push --no-verify-jwt
//
// Secrets (Project Settings → Edge Functions, or `supabase secrets set`):
//   CRON_SECRET             matches <CRON_SECRET> used in schema-additions.sql
//   VAPID_PUBLIC_KEY        from `npx web-push generate-vapid-keys`
//   VAPID_PRIVATE_KEY       from the same command
//   VAPID_SUBJECT           e.g. mailto:you@example.com
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are injected automatically.
//
// Called with one of:
//   { "type": "reminders", "hour": 21 }
//   { "type": "direct", "user_id": "...", "title": "...", "body": "...", "url": "./index.html" }

import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? '';
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:anchor@example.com';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

async function sendToUser(userId: string, payload: Record<string, unknown>) {
  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('*')
    .eq('owner_id', userId);

  await Promise.all((subs ?? []).map(async (s) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(payload),
      );
    } catch (err) {
      const code = (err as { statusCode?: number }).statusCode;
      // 404/410 mean the subscription is dead — clean it up.
      if (code === 404 || code === 410) {
        await admin.from('push_subscriptions').delete().eq('endpoint', s.endpoint);
      } else {
        console.error('push failed', code, (err as Error).message);
      }
    }
  }));
}

Deno.serve(async (req) => {
  if (req.headers.get('x-anchor-cron') !== CRON_SECRET || !CRON_SECRET) {
    return new Response('forbidden', { status: 403 });
  }

  const body = await req.json().catch(() => ({}));

  if (body.type === 'direct' && body.user_id) {
    await sendToUser(body.user_id, {
      title: body.title ?? 'Anchor',
      body: body.body ?? '',
      url: body.url ?? './index.html',
    });
    return new Response('ok');
  }

  if (body.type === 'reminders') {
    const hour = typeof body.hour === 'number' ? body.hour : 21;
    const { data: targets, error } = await admin.rpc('push_reminder_targets', { p_hour: hour });
    if (error) return new Response('rpc error: ' + error.message, { status: 500 });

    await Promise.all((targets ?? [])
      .filter((t: { pending: number }) => t.pending > 0)
      .map((t: { owner_id: string; pending: number }) => sendToUser(t.owner_id, {
        title: 'Anchor',
        body: `You have ${t.pending} goal${t.pending > 1 ? 's' : ''} still open today.`,
        url: './index.html',
      })));

    return new Response('ok');
  }

  return new Response('noop');
});
