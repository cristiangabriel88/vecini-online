// Netlify Function: resend or revoke a pending admin invite (T250).
//
// Security model:
//  - POST only.
//  - Requires isSupabaseAdminConfigured() (service-role key + Supabase URL).
//  - Caller resolved server-side via verifyBearerToken() -- never trusts a
//    client-supplied user id or role.
//  - Platform superadmin status re-verified server-side by querying
//    platform_admins directly via the service-role client.
//  - Payload validated server-side (valid action, non-empty inviteId/token).
//  - Resend is rate-limited per IP (20/hr, same limiter as provisioning).
//
// HTTP responses:
//  405  method-not-allowed     (non-POST)
//  503  backend-not-configured (Supabase admin env missing)
//  401  unauthorized           (missing or invalid bearer token)
//  403  forbidden              (caller not in platform_admins)
//  400  invalid-json           (unparseable body)
//  422  validation-failed      (missing or invalid fields)
//  404  not-found              (invite not found or already redeemed)
//  502  db-error               (update failed)
//  200  { ok: true, action }
//
// Privacy: never log user ids, PII, or invite tokens verbatim.

import { randomBytes } from 'node:crypto';
import { checkProvisionRateLimit } from './_shared/rateLimiter';
import { buildOnboardingLink, generateInviteCode } from '../../src/shared/lib/inviteCode';
import { buildAdminInviteEmail } from '../../src/shared/lib/inviteEmail';
import { isResendConfigured, sendEmail } from './_shared/resend';
import { reportEmailFailure } from './_shared/emailFailureReporter';
import {
  isSupabaseAdminConfigured,
  supabaseAdmin,
  verifyBearerToken,
} from './_shared/supabaseAdmin';
import { appendAudit } from './_shared/appendAudit';

/** 24-hour invite validity window, in milliseconds. */
const INVITE_TTL_MS = 24 * 60 * 60 * 1000;

function generateToken(): string {
  return randomBytes(32).toString('hex');
}

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

interface InviteActionPayload {
  action?: unknown;
  inviteId?: unknown;
  locale?: unknown;
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return json(405, { error: 'method-not-allowed' });

  if (!isSupabaseAdminConfigured()) return json(503, { error: 'backend-not-configured' });

  const { userId, error: authError } = await verifyBearerToken(
    req.headers.get('Authorization'),
  );
  if (!userId) return json(401, { error: authError ?? 'unauthorized' });

  const db = supabaseAdmin();

  const { data: adminRow } = await db
    .from('platform_admins')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (!adminRow) return json(403, { error: 'forbidden' });

  let payload: InviteActionPayload;
  try {
    payload = (await req.json()) as InviteActionPayload;
  } catch {
    return json(400, { error: 'invalid-json' });
  }

  const action = typeof payload.action === 'string' ? payload.action.trim() : '';
  const inviteId = typeof payload.inviteId === 'string' ? payload.inviteId.trim() : '';
  const locale = typeof payload.locale === 'string' ? payload.locale : 'ro';

  if (!['resend', 'revoke'].includes(action)) {
    return json(422, { error: 'validation-failed', field: 'action' });
  }
  if (!inviteId) return json(422, { error: 'validation-failed', field: 'inviteId' });

  // Look up the invite by token (inviteId may be a token or UUID).
  const { data: invite } = await db
    .from('invite_codes')
    .select('id, asociatie_id, invitee_name, invitee_email, expires_at, kind')
    .or(`token.eq.${inviteId},id.eq.${inviteId}`)
    .eq('kind', 'admin_setup')
    .maybeSingle();

  if (!invite) return json(404, { error: 'not-found' });

  if (action === 'revoke') {
    // Expire the invite immediately so the link no longer works.
    const { error: updateErr } = await db
      .from('invite_codes')
      .update({ expires_at: new Date().toISOString() })
      .eq('id', (invite as { id: string }).id);
    if (updateErr) return json(502, { error: 'db-error' });

    // Append to the asociatie's audit chain.
    const assocId = (invite as { asociatie_id: string }).asociatie_id;
    const auditErr = await appendAudit(db, {
      asociatie_id: assocId,
      actor_user_id: userId,
      actor_name: null,
      action: 'admin.invite_revoked',
      entity: 'admin',
      entity_label: (invite as { invitee_email: string }).invitee_email,
      before_value: null,
      after_value: 'revoked',
    });
    if (auditErr.error) return json(502, { error: 'audit-error' });

    return json(200, { ok: true, action: 'revoke' });
  }

  // action === 'resend'
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '';
  if (clientIp && !checkProvisionRateLimit(clientIp)) {
    return new Response(JSON.stringify({ error: 'rate-limited' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': '3600' },
    });
  }

  const newToken = generateToken();
  const newCode = generateInviteCode();
  const newExpiresAt = new Date(Date.now() + INVITE_TTL_MS).toISOString();

  const { error: updateErr } = await db
    .from('invite_codes')
    .update({ token: newToken, code: newCode, expires_at: newExpiresAt })
    .eq('id', (invite as { id: string }).id);
  if (updateErr) return json(502, { error: 'db-error' });

  let emailSent = false;
  if (isResendConfigured()) {
    const appUrl = (process.env.APP_URL ?? 'https://vecini.online').replace(/\/+$/, '');
    const setupLink = buildOnboardingLink(appUrl, newToken);
    const adminName = (invite as { invitee_name: string }).invitee_name;
    const adminEmail = (invite as { invitee_email: string }).invitee_email;
    const email = buildAdminInviteEmail({ locale, adminName, setupLink, qrCodeDataUrl: null });
    const result = await sendEmail({
      to: adminEmail,
      subject: email.subject,
      text: email.text,
      html: email.html,
    });
    emailSent = result.ok;
    if (!result.ok) {
      void reportEmailFailure('admin-invite', 'admin', result.reason ?? 'send-failed', result.attempts).catch(() => {});
    }
  }

  return json(200, { ok: true, action: 'resend', emailSent });
};
