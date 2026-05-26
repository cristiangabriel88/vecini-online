// Netlify Function: deliver an asociatie invitation email (T147, hardened T148).
//
// Security model (T148):
//  - Requires `Authorization: Bearer <access_token>` from the caller.
//  - The caller's identity is resolved server-side via the service-role
//    `auth.getUser()` -- never trusted from the request body.
//  - The caller must be an active admin or presedinte of the target asociatie.
//  - The invite is fetched from `invite_codes` by id -- the recipient address,
//    name and token are resolved from the DB row, not from client-supplied fields,
//    so the function cannot be used as an open email relay.
//  - Rate-limited: max 20 sends per 10 minutes per caller+asociatie.
//
// Two templates (T153):
//  - kind === 'admin_setup' (or absent): polished admin invite with branded
//    header, rounded-pill CTA and an embedded QR code generated server-side
//    using `qrcode`.
//  - kind === 'resident_invite': the existing resident template (T147).
//
// Requires both Resend (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`) and the
// Supabase service-role key (`SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_URL`)
// to be configured.  If either is absent the endpoint returns 503 so the
// offline/demo path is never blocked by a missing env (the client guards with
// `isSupabaseConfigured` and skips the live call).
//
// Privacy: never log the recipient, token, rendered body, or user id.

import QRCode from 'qrcode';
import { buildAdminInviteEmail, buildInviteEmail } from '../../src/shared/lib/inviteEmail';
import { buildOnboardingLink } from '../../src/shared/lib/inviteCode';
import { isResendConfigured, sendEmail } from './_shared/resend';
import {
  isSupabaseAdminConfigured,
  verifyBearerToken,
  isAdminOfAsociatie,
  getInviteById,
  getAsociatieName,
} from './_shared/supabaseAdmin';
import { checkInviteRateLimit } from './_shared/rateLimiter';

interface InviteEmailRequest {
  /** UUID of the invite_codes row to deliver. */
  inviteId?: string;
  /** Recipient locale used to select the email template language. */
  locale?: string;
  /**
   * Template kind. `'admin_setup'` renders the polished admin template with
   * branded header, rounded-pill CTA and embedded QR code (T153). Omitting
   * this field (or `'resident_invite'`) renders the standard resident template.
   */
  kind?: 'admin_setup' | 'resident_invite';
}

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return json(405, { error: 'method-not-allowed' });

  // Both the email provider and the service-role backend must be present.
  if (!isResendConfigured()) return json(503, { error: 'email-not-configured' });
  if (!isSupabaseAdminConfigured()) return json(503, { error: 'backend-not-configured' });

  // ── Auth: resolve the caller from the bearer token ───────────────────────
  const authHeader = req.headers.get('Authorization');
  const { userId, error: authError } = await verifyBearerToken(authHeader);
  if (!userId) return json(401, { error: authError ?? 'unauthorized' });

  // ── Parse body ────────────────────────────────────────────────────────────
  let payload: InviteEmailRequest;
  try {
    payload = (await req.json()) as InviteEmailRequest;
  } catch {
    return json(400, { error: 'invalid-json' });
  }

  const inviteId = payload.inviteId?.trim() ?? '';
  if (!UUID_RE.test(inviteId)) return json(400, { error: 'invalid-invite-id' });

  // ── DB lookup: resolve invite from stored row (never from client fields) ──
  const invite = await getInviteById(inviteId);
  if (!invite) return json(404, { error: 'invite-not-found' });

  // Reject consumed, revoked, or expired invites before doing any auth check
  // to avoid timing side-channels.
  const now = Date.now();
  if (invite.revoked_at) return json(409, { error: 'invite-revoked' });
  if (invite.consumed_at) return json(409, { error: 'invite-consumed' });
  if (invite.expires_at && now >= new Date(invite.expires_at).getTime()) {
    return json(409, { error: 'invite-expired' });
  }
  if (!invite.invitee_email) return json(422, { error: 'no-recipient' });
  if (!invite.token) return json(422, { error: 'invite-missing-token' });

  // ── Rate limit: per caller + asociatie ────────────────────────────────────
  const rateLimitKey = `${userId}:${invite.asociatie_id}`;
  if (!checkInviteRateLimit(rateLimitKey, now)) {
    return json(429, { error: 'rate-limited' });
  }

  // ── Authorization: caller must administer this asociatie ─────────────────
  const authorized = await isAdminOfAsociatie(userId, invite.asociatie_id);
  if (!authorized) return json(403, { error: 'forbidden' });

  // ── Resolve asociatie name and build the link server-side ─────────────────
  const asociatieName = await getAsociatieName(invite.asociatie_id);
  if (!asociatieName) return json(502, { error: 'asociatie-not-found' });

  const appUrl = (process.env.APP_URL ?? 'https://vecini.online').replace(/\/+$/, '');
  const inviteLink = buildOnboardingLink(appUrl, invite.token);

  // ── Render template and send ──────────────────────────────────────────────
  const isAdminKind = payload.kind === 'admin_setup';

  let email;
  if (isAdminKind) {
    // Generate a QR code as an inline base64 PNG (200x200, subtle dark-on-white).
    // On failure we silently omit the QR rather than rejecting the request.
    let qrCodeDataUrl: string | null = null;
    try {
      qrCodeDataUrl = await QRCode.toDataURL(inviteLink, {
        width: 200,
        margin: 2,
        color: { dark: '#1f2933', light: '#ffffff' },
      });
    } catch {
      // Non-fatal: the template renders without the QR block.
    }

    email = buildAdminInviteEmail({
      locale: payload.locale,
      adminName: invite.invitee_name ?? null,
      setupLink: inviteLink,
      qrCodeDataUrl,
    });
  } else {
    email = buildInviteEmail({
      locale: payload.locale,
      recipientName: invite.invitee_name ?? null,
      asociatieName,
      inviteLink,
    });
  }

  const result = await sendEmail({
    to: invite.invitee_email,
    subject: email.subject,
    text: email.text,
    html: email.html,
  });

  if (!result.ok) return json(502, { error: 'send-failed' });
  return json(200, { ok: true });
};
