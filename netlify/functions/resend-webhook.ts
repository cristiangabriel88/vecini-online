// Netlify Function: Resend delivery webhook receiver (T149).
//
// Resend signs webhook payloads using Svix HMAC-SHA256:
//   key        = Buffer.from(secret.replace(/^whsec_/, ''), 'base64')
//   signed     = `${svix-id}.${svix-timestamp}.${rawBody}`
//   expected   = HMAC-SHA256(key, signed) encoded as base64
//
// Timestamp freshness is enforced (±5 min) to guard against replay attacks.
//
// On `email.delivered`: stamps `invite_email_delivered_at` on the matching
//   invite_codes row (looked up by resend_message_id, stored by invite-email.ts).
// On `email.bounced`:   acknowledged without action (no bounce column yet).
// Other event types:    acknowledged silently.
//
// Privacy: never log the recipient address, message id, or any PII.

import { createHmac } from 'crypto';
import { isSupabaseAdminConfigured, supabaseAdmin } from './_shared/supabaseAdmin';

const FIVE_MINUTES_MS = 5 * 60 * 1000;

function verifyWebhookSignature(
  rawBody: string,
  svixId: string,
  svixTimestamp: string,
  svixSignature: string,
  secret: string,
): boolean {
  const tsMs = Number(svixTimestamp) * 1000;
  if (!Number.isFinite(tsMs) || Math.abs(Date.now() - tsMs) > FIVE_MINUTES_MS) return false;

  const secretBytes = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  const signedContent = `${svixId}.${svixTimestamp}.${rawBody}`;
  const expected = createHmac('sha256', secretBytes).update(signedContent).digest('base64');

  // svixSignature may carry multiple space-separated "v1,<base64>" tokens.
  return svixSignature.split(' ').some((sig) => {
    const comma = sig.indexOf(',');
    return comma !== -1 && sig.slice(comma + 1) === expected;
  });
}

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return json(405, { error: 'method-not-allowed' });

  const secret = process.env.RESEND_WEBHOOK_SECRET ?? '';
  if (!secret) return json(503, { error: 'webhook-not-configured' });
  if (!isSupabaseAdminConfigured()) return json(503, { error: 'backend-not-configured' });

  const svixId = req.headers.get('svix-id') ?? '';
  const svixTimestamp = req.headers.get('svix-timestamp') ?? '';
  const svixSignature = req.headers.get('svix-signature') ?? '';
  if (!svixId || !svixTimestamp || !svixSignature) {
    return json(400, { error: 'missing-svix-headers' });
  }

  const rawBody = await req.text();

  if (!verifyWebhookSignature(rawBody, svixId, svixTimestamp, svixSignature, secret)) {
    return json(401, { error: 'invalid-signature' });
  }

  let event: { type?: string; data?: { email_id?: string } };
  try {
    event = JSON.parse(rawBody) as typeof event;
  } catch {
    return json(400, { error: 'invalid-json' });
  }

  const { type, data } = event;

  // Only stamp on confirmed delivery; acknowledge bounced + all other types silently.
  if (type !== 'email.delivered') return json(200, { ok: true });

  const messageId = data?.email_id;
  if (!messageId) return json(400, { error: 'missing-email-id' });

  const { error } = await supabaseAdmin()
    .from('invite_codes')
    .update({ invite_email_delivered_at: new Date().toISOString() })
    .eq('resend_message_id', messageId);

  if (error) return json(500, { error: 'update-failed' });
  return json(200, { ok: true });
};
