// Netlify Function: deliver an asociație invitation email (T147).
//
// The client (admin apartment surface / invites surface) posts the recipient,
// their locale, the asociație name and the onboarding link; this function
// renders the shared bilingual template and sends it via Resend. The template
// builder is the same `buildInviteEmail` the client uses, imported from
// src/shared so one copy drives both, exactly like the Telegram adapters.
//
// Auth note: this endpoint must not become an open email relay. Re-verifying
// the caller server-side (bearer token -> trusted user -> admin of the target
// asociație, via the service role) lands with the first service-role functions
// in T142; this function ships the delivery half now and documents that gate.
// Until then it is only reachable on a live deployment with Resend configured.
//
// Privacy: never log the recipient, link, or rendered body.
import { buildInviteEmail } from '../../src/shared/lib/inviteEmail';
import { isResendConfigured, sendEmail } from './_shared/resend';

interface InviteEmailRequest {
  to?: string;
  locale?: string;
  recipientName?: string | null;
  asociatieName?: string;
  inviteLink?: string;
}

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return json(405, { error: 'method-not-allowed' });
  if (!isResendConfigured()) return json(503, { error: 'email-not-configured' });

  let payload: InviteEmailRequest;
  try {
    payload = (await req.json()) as InviteEmailRequest;
  } catch {
    return json(400, { error: 'invalid-json' });
  }

  const to = payload.to?.trim() ?? '';
  const asociatieName = payload.asociatieName?.trim() ?? '';
  const inviteLink = payload.inviteLink?.trim() ?? '';
  if (!EMAIL_RE.test(to) || !asociatieName || !inviteLink) {
    return json(400, { error: 'missing-fields' });
  }

  const email = buildInviteEmail({
    locale: payload.locale,
    recipientName: payload.recipientName ?? null,
    asociatieName,
    inviteLink,
  });

  const result = await sendEmail({
    to,
    subject: email.subject,
    text: email.text,
    html: email.html,
  });

  if (!result.ok) return json(502, { error: 'send-failed' });
  return json(200, { ok: true });
};
