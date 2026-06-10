// Netlify Function: server-side privileged provisioning of a new asociatie +
// admin setup invite (T92).
//
// Security model:
//  - POST only.
//  - Requires isSupabaseAdminConfigured() (service-role key + Supabase URL).
//  - Caller resolved server-side via verifyBearerToken() -- never trusts a
//    client-supplied user id or role.
//  - Platform superadmin status re-verified server-side by querying
//    platform_admins directly via the service-role client (equivalent to
//    is_super_admin(), which uses auth.uid() and therefore cannot be invoked
//    under the service role; the verified userId from verifyBearerToken is used
//    as the lookup key instead).
//  - Payload validated server-side (adminName >= 2 chars, valid email). Logic
//    mirrors validateAdminInvite from platformProvisioningLogic but is inlined
//    here to avoid @/ import chains that fail under tsconfig.node.json.
//  - Invite token generated server-side from crypto.randomBytes; never accepted
//    from the client.
//  - Email dispatched only when isResendConfigured(); non-fatal when absent.
//
// HTTP responses:
//  405  method-not-allowed     (non-POST)
//  503  backend-not-configured (Supabase admin env missing)
//  401  unauthorized           (missing or invalid bearer token)
//  403  forbidden              (caller not in platform_admins)
//  400  invalid-json           (unparseable body)
//  422  validation-failed      (adminName / adminEmail)
//  502  db-error-asociatie     (asociatii insert failed)
//  502  db-error-invite        (invite_codes insert failed)
//  200  { ok: true, inviteId, emailSent }
//
// Privacy: never log the recipient email, invite token, user id, or any PII.

import { createHash, randomBytes } from 'node:crypto';
import { checkProvisionRateLimit } from './_shared/rateLimiter';
import QRCode from 'qrcode';
import { buildAdminInviteEmail } from '../../src/shared/lib/inviteEmail';
import { buildOnboardingLink, generateInviteCode } from '../../src/shared/lib/inviteCode';
import { isResendConfigured, sendEmail } from './_shared/resend';
import { reportEmailFailure } from './_shared/emailFailureReporter';
import {
  isSupabaseAdminConfigured,
  supabaseAdmin,
  verifyBearerToken,
} from './_shared/supabaseAdmin';

// ── Validation ────────────────────────────────────────────────────────────────
// Mirrors platformProvisioningLogic.validateAdminInvite; inlined here to avoid
// the @/ import chain (platformProvisioningLogic -> @/shared/lib/identity ->
// @/features/auth/authLogic) which tsconfig.node.json cannot resolve.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type AdminInviteFieldError = 'required' | 'tooShort' | 'email';
type AdminInviteErrors = Partial<Record<'adminName' | 'adminEmail', AdminInviteFieldError>>;

interface AdminInviteValidResult {
  adminName: string;
  adminEmail: string;
}

function validatePayload(
  rawName: string,
  rawEmail: string,
): { value: AdminInviteValidResult | null; errors: AdminInviteErrors } {
  const adminName = rawName.trim();
  const adminEmail = rawEmail.trim();
  const errors: AdminInviteErrors = {};
  if (!adminName) errors.adminName = 'required';
  else if (adminName.length < 2) errors.adminName = 'tooShort';
  if (!adminEmail) errors.adminEmail = 'required';
  else if (!EMAIL_RE.test(adminEmail)) errors.adminEmail = 'email';
  const value = Object.keys(errors).length === 0 ? { adminName, adminEmail } : null;
  return { value, errors };
}

// ── Constants ─────────────────────────────────────────────────────────────────

/** 24-hour invite validity window, in milliseconds. */
const INVITE_TTL_MS = 24 * 60 * 60 * 1000;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Generate an opaque 64-hex-char invite token (32 random bytes from Node.js crypto). */
function generateToken(): string {
  return randomBytes(32).toString('hex');
}

/** Generate a URL-safe, collision-resistant slug for the provisional asociatie. */
function generateSlug(): string {
  return `asoc-${randomBytes(12).toString('hex')}`;
}

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

interface ProvisionPayload {
  adminName?: unknown;
  adminEmail?: unknown;
  /** Recipient locale for the email template ('ro' | 'en'). Defaults to 'ro'. */
  locale?: unknown;
}

// ── Handler ───────────────────────────────────────────────────────────────────

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return json(405, { error: 'method-not-allowed' });

  // Per-IP rate limit: 20 requests / 60 min (T197)
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '';
  if (clientIp && !checkProvisionRateLimit(clientIp)) {
    return new Response(JSON.stringify({ error: 'rate-limited' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': '3600' },
    });
  }

  // Supabase admin env must be present before any DB or auth call.
  if (!isSupabaseAdminConfigured()) return json(503, { error: 'backend-not-configured' });

  // Auth: resolve the caller from the bearer token.
  // Never accept a user id or role from the request body -- only the id returned
  // by verifyBearerToken() (which calls auth.getUser() server-side) is trusted.
  const { userId, error: authError } = await verifyBearerToken(
    req.headers.get('Authorization'),
  );
  if (!userId) return json(401, { error: authError ?? 'unauthorized' });

  // Authorization: re-verify the caller is a platform superadmin server-side.
  // We query platform_admins directly via the service-role client because
  // is_super_admin() uses auth.uid() which is null under the service role.
  // The check is semantically identical: same table, same equality condition.
  const { data: adminRow } = await supabaseAdmin()
    .from('platform_admins')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (!adminRow) return json(403, { error: 'forbidden' });

  // Parse body.
  let payload: ProvisionPayload;
  try {
    payload = (await req.json()) as ProvisionPayload;
  } catch {
    return json(400, { error: 'invalid-json' });
  }

  // Validate: adminName >= 2 chars, valid email format.
  // Never trust the client to have already validated; always re-check server-side.
  const adminName = typeof payload.adminName === 'string' ? payload.adminName : '';
  const adminEmail = typeof payload.adminEmail === 'string' ? payload.adminEmail : '';
  const locale = typeof payload.locale === 'string' ? payload.locale : 'ro';

  const { value, errors } = validatePayload(adminName, adminEmail);
  if (!value) return json(422, { error: 'validation-failed', fields: errors });

  const db = supabaseAdmin();

  // Create the provisional asociatie row.
  // The admin fills in the real identity (name, address, CUI, etc.) during the
  // onboarding wizard (T154) after accepting the invite. The slug must be unique
  // across all tenants; a 24-hex-char random suffix makes collisions negligible.
  const { data: asoc, error: asocErr } = await db
    .from('asociatii')
    .insert({
      name: '(de completat)',
      slug: generateSlug(),
      address: '(de completat)',
    })
    .select('id')
    .single();
  if (asocErr || !asoc) return json(502, { error: 'db-error-asociatie' });

  const asociatieId = (asoc as { id: string }).id;

  // Create the 24h admin setup invite row.
  // The token is the high-entropy deep-link identifier; the code satisfies the
  // NOT NULL constraint and serves as a manual-entry fallback (not shown in UI
  // after T157). Neither is accepted from the client.
  // Hash-at-rest (T128): resolve/redeem_onboarding_token look the row up by
  // sha256(plaintext), so the DB must store the digest. The plaintext lives
  // only in the emailed link.
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
      invitee_name: value.adminName,
      invitee_email: value.adminEmail,
      kind: 'admin_setup',
    })
    .select('id')
    .single();
  if (inviteErr || !invite) return json(502, { error: 'db-error-invite' });

  const inviteId = (invite as { id: string }).id;

  // Dispatch the admin invite email when Resend is configured.
  // Non-fatal: if Resend is absent or the send fails we still return the created
  // invite so the superadmin can retry or share the link manually later.
  let emailSent = false;
  if (isResendConfigured()) {
    const appUrl = (process.env.APP_URL ?? 'https://vecini.online').replace(/\/+$/, '');
    const setupLink = buildOnboardingLink(appUrl, token);

    // Generate a QR code for embedding in the email (non-fatal on failure).
    let qrCodeDataUrl: string | null = null;
    try {
      qrCodeDataUrl = await QRCode.toDataURL(setupLink, {
        width: 200,
        margin: 2,
        color: { dark: '#1f2933', light: '#ffffff' },
      });
    } catch {
      // QR generation is best-effort; the template renders without it.
    }

    const email = buildAdminInviteEmail({
      locale,
      adminName: value.adminName,
      setupLink,
      qrCodeDataUrl,
    });

    // Callers must never log the rendered body (it contains the secret link).
    const result = await sendEmail({
      to: value.adminEmail,
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
