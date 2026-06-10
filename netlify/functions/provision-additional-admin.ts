// Netlify Function: provision an additional admin for an existing asociatie (T250).
//
// Security model:
//  - POST only.
//  - Requires isSupabaseAdminConfigured() (service-role key + Supabase URL).
//  - Caller resolved server-side via verifyBearerToken() -- never trusts a
//    client-supplied user id or role.
//  - Platform superadmin status re-verified server-side by querying
//    platform_admins directly via the service-role client.
//  - Payload validated server-side (adminName >= 2 chars, valid email).
//  - Per-IP rate limit: 20 requests / 60 min (same limiter as provisioning).
//  - The asociatieId must reference an existing, non-archived asociatie.
//
// HTTP responses:
//  405  method-not-allowed     (non-POST)
//  503  backend-not-configured (Supabase admin env missing)
//  429  rate-limited
//  401  unauthorized           (missing or invalid bearer token)
//  403  forbidden              (caller not in platform_admins)
//  400  invalid-json           (unparseable body)
//  422  validation-failed      (adminName / adminEmail / asociatieId)
//  404  not-found              (asociatieId does not exist)
//  502  db-error-invite        (invite_codes insert failed)
//  200  { ok: true, inviteId, emailSent }
//
// Privacy: never log the recipient email, invite token, user id, or any PII.

import { createHash, randomBytes } from 'node:crypto';
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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

interface ProvisionAdditionalAdminPayload {
  asociatieId?: unknown;
  adminName?: unknown;
  adminEmail?: unknown;
  locale?: unknown;
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return json(405, { error: 'method-not-allowed' });

  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '';
  if (clientIp && !checkProvisionRateLimit(clientIp)) {
    return new Response(JSON.stringify({ error: 'rate-limited' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': '3600' },
    });
  }

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

  let payload: ProvisionAdditionalAdminPayload;
  try {
    payload = (await req.json()) as ProvisionAdditionalAdminPayload;
  } catch {
    return json(400, { error: 'invalid-json' });
  }

  const asociatieId = typeof payload.asociatieId === 'string' ? payload.asociatieId.trim() : '';
  const rawName = typeof payload.adminName === 'string' ? payload.adminName : '';
  const rawEmail = typeof payload.adminEmail === 'string' ? payload.adminEmail : '';
  const locale = typeof payload.locale === 'string' ? payload.locale : 'ro';

  if (!asociatieId) return json(422, { error: 'validation-failed', field: 'asociatieId' });

  const adminName = rawName.trim();
  const adminEmail = rawEmail.trim();
  const errors: Record<string, string> = {};
  if (!adminName) errors.adminName = 'required';
  else if (adminName.length < 2) errors.adminName = 'tooShort';
  if (!adminEmail) errors.adminEmail = 'required';
  else if (!EMAIL_RE.test(adminEmail)) errors.adminEmail = 'email';
  if (Object.keys(errors).length > 0) return json(422, { error: 'validation-failed', fields: errors });

  // Verify the asociatie exists and is not archived.
  const { data: asoc } = await db
    .from('asociatii')
    .select('id, name')
    .eq('id', asociatieId)
    .is('deleted_at', null)
    .neq('status', 'archived')
    .maybeSingle();
  if (!asoc) return json(404, { error: 'not-found' });

  // Hash-at-rest (T128): the onboarding RPCs look the row up by
  // sha256(plaintext), so the DB stores only the digest; the plaintext token
  // lives only in the emailed link.
  const token = generateToken();
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const code = generateInviteCode();
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS).toISOString();

  const { data: invite, error: inviteErr } = await db
    .from('invite_codes')
    .insert({
      asociatie_id: asociatieId,
      code,
      token: tokenHash,
      expires_at: expiresAt,
      invitee_name: adminName,
      invitee_email: adminEmail,
      kind: 'admin_setup',
    })
    .select('id')
    .single();
  if (inviteErr || !invite) return json(502, { error: 'db-error-invite' });

  const inviteId = (invite as { id: string }).id;

  // Append to the asociatie's audit chain.
  const auditErr = await appendAudit(db, {
    asociatie_id: asociatieId,
    actor_user_id: userId,
    actor_name: null,
    action: 'admin.provisioned',
    entity: 'admin',
    entity_label: adminEmail,
    before_value: null,
    after_value: 'admin',
  });
  if (auditErr.error) return json(502, { error: 'audit-error' });

  let emailSent = false;
  if (isResendConfigured()) {
    const appUrl = (process.env.APP_URL ?? 'https://vecini.online').replace(/\/+$/, '');
    const setupLink = buildOnboardingLink(appUrl, token);
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

  return json(200, { ok: true, inviteId, emailSent });
};
