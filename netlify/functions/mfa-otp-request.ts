// Netlify Function: issue an email OTP challenge for app-managed 2FA (T142).
//
// Security model:
//  - Requires `Authorization: Bearer <access_token>` from the caller.
//  - The caller's user_id and email address are resolved server-side via
//    service-role auth.getUser() -- never trusted from the request body.
//  - session_id is extracted from the JWT payload (not supplied by the client).
//  - Server-side resend cooldown (OTP_RESEND_COOLDOWN_MS) prevents rapid re-sends.
//  - Hourly issue ceiling (MAX_ISSUE_PER_HOUR) limits code farming per channel.
//  - Only code/token hashes are stored in mfa_otp_challenges; plaintexts never persist.
//  - No secrets, PII, plaintext codes, or email addresses are logged.
//
// Telegram delivery is deferred to post-MVP (BACKLOG.md Deferred section).
// Only the 'email' channel is implemented here.
//
// LIVE ACTIVATION (manual step, not an overnight blocker):
//   Requires SUPABASE_SERVICE_ROLE_KEY + VITE_SUPABASE_URL + RESEND_API_KEY +
//   RESEND_FROM_EMAIL in the Netlify environment. APP_URL should point to the
//   deployed resident app origin (e.g. https://vecini.online).
//   See .env.example and SECURITY.md for full details.

import { buildOtpEmail } from '../../src/shared/lib/otpEmail';
import {
  generateNumericOtp,
  generateOtpSalt,
  hashOtp,
  generateConfirmToken,
  hashConfirmToken,
  OTP_TTL_MS,
  OTP_RESEND_COOLDOWN_MS,
} from '../../src/features/auth/otpChannelLogic';
import { sendEmail, getMailMode, isResendConfigured } from './_shared/resend';
import { isSupabaseAdminConfigured, supabaseAdmin } from './_shared/supabaseAdmin';

const EMAIL_CHANNEL = 'email';
const MAX_ISSUE_PER_HOUR = 10;

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Extract the raw JWT string from an Authorization: Bearer header. */
function extractBearerToken(header: string | null | undefined): string | null {
  if (!header) return null;
  const m = /^Bearer\s+(\S+)$/i.exec(header.trim());
  return m ? m[1] : null;
}

/**
 * Extract the session_id claim from a Supabase JWT by decoding the payload
 * segment (base64url). Integrity is guaranteed by the preceding auth.getUser()
 * call; this only reads an already-verified payload.
 */
export function extractSessionId(jwt: string): string | null {
  try {
    const parts = jwt.split('.');
    if (parts.length < 2) return null;
    const padded = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const decoded = Buffer.from(padded, 'base64').toString('utf8');
    const claims = JSON.parse(decoded) as Record<string, unknown>;
    return typeof claims.session_id === 'string' ? claims.session_id : null;
  } catch {
    return null;
  }
}

interface RequestBody {
  channel?: unknown;
  locale?: unknown;
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return json(405, { error: 'method-not-allowed' });

  const mailMode = getMailMode();
  if (mailMode === 'resend' && !isResendConfigured()) {
    return json(503, { error: 'email-not-configured' });
  }
  if (!isSupabaseAdminConfigured()) return json(503, { error: 'backend-not-configured' });

  // ── Auth: resolve the caller from the bearer token ───────────────────────
  const rawToken = extractBearerToken(req.headers.get('Authorization'));
  if (!rawToken) return json(401, { error: 'missing-authorization' });

  const { data: authData, error: authErr } = await supabaseAdmin().auth.getUser(rawToken);
  if (authErr || !authData.user) return json(401, { error: 'invalid-token' });

  const userId = authData.user.id;
  const userEmail = authData.user.email;
  if (!userEmail) return json(422, { error: 'no-email' });

  const sessionId = extractSessionId(rawToken);
  if (!sessionId) return json(422, { error: 'no-session' });

  // ── Parse and validate body ───────────────────────────────────────────────
  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return json(400, { error: 'invalid-json' });
  }

  const channel = typeof body.channel === 'string' ? body.channel.trim() : '';
  if (channel !== EMAIL_CHANNEL) {
    return json(422, { error: 'unsupported-channel' });
  }

  const locale = typeof body.locale === 'string' ? body.locale : null;

  // ── Verify this user has the email channel enabled ────────────────────────
  const { data: channelRow } = await supabaseAdmin()
    .from('mfa_channels')
    .select('id')
    .eq('user_id', userId)
    .eq('channel', EMAIL_CHANNEL)
    .maybeSingle();
  if (!channelRow) return json(422, { error: 'channel-not-enabled' });

  const now = new Date();

  // ── Server-side resend cooldown ───────────────────────────────────────────
  const cooldownCutoff = new Date(now.getTime() - OTP_RESEND_COOLDOWN_MS).toISOString();
  const { count: recentCount } = await supabaseAdmin()
    .from('mfa_otp_challenges')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('channel', EMAIL_CHANNEL)
    .gte('created_at', cooldownCutoff);
  if ((recentCount ?? 0) > 0) {
    return json(429, { error: 'resend-cooldown' });
  }

  // ── Hourly issue ceiling ──────────────────────────────────────────────────
  const hourlyCutoff = new Date(now.getTime() - 3_600_000).toISOString();
  const { count: hourlyCount } = await supabaseAdmin()
    .from('mfa_otp_challenges')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('channel', EMAIL_CHANNEL)
    .gte('created_at', hourlyCutoff);
  if ((hourlyCount ?? 0) >= MAX_ISSUE_PER_HOUR) {
    return json(429, { error: 'rate-limited' });
  }

  // ── Mint the challenge ────────────────────────────────────────────────────
  const code = generateNumericOtp();
  const salt = generateOtpSalt();
  const codeHash = await hashOtp(code, salt);
  const confirmToken = generateConfirmToken();
  const confirmTokenHash = await hashConfirmToken(confirmToken);
  const expiresAt = new Date(now.getTime() + OTP_TTL_MS).toISOString();

  const { error: insertErr } = await supabaseAdmin().from('mfa_otp_challenges').insert({
    user_id: userId,
    channel: EMAIL_CHANNEL,
    code_hash: codeHash,
    code_salt: salt,
    confirm_token_hash: confirmTokenHash,
    expires_at: expiresAt,
    session_id: sessionId,
  });
  if (insertErr) return json(500, { error: 'challenge-create-failed' });

  // ── Build email content ───────────────────────────────────────────────────
  const appUrl = (
    process.env.APP_URL ??
    process.env.VITE_RESIDENT_APP_URL ??
    process.env.VITE_APP_URL ??
    'https://vecini.online'
  ).replace(/\/+$/, '');
  const confirmLink = `${appUrl}/confirma-2fa?token=${encodeURIComponent(confirmToken)}&channel=${EMAIL_CHANNEL}`;
  const expiryMinutes = Math.round(OTP_TTL_MS / 60_000);

  const emailContent = buildOtpEmail({ locale, code, confirmLink, expiryMinutes });

  // ── Mail mode branching ───────────────────────────────────────────────────
  if (mailMode === 'disabled') {
    return json(200, { ok: true, delivered: false, reason: 'mail_disabled' });
  }

  if (mailMode === 'log') {
    // email_outbox requires asociatie_id (not applicable here); log non-PII only.
    console.info('[mail:log] OTP email requested, session prefix:', sessionId.slice(0, 8));
    return json(200, { ok: true, delivered: false, logged: true });
  }

  // mailMode === 'resend': live send
  const result = await sendEmail({
    to: userEmail,
    subject: emailContent.subject,
    text: emailContent.text,
    html: emailContent.html,
  });

  if (!result.ok) return json(502, { error: 'send-failed' });
  return json(200, { ok: true });
};
