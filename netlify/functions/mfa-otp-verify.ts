// Netlify Function: verify an email OTP challenge and elevate the session (T142).
//
// Security model:
//  - Requires `Authorization: Bearer <access_token>` from the caller.
//  - The caller's user_id is resolved server-side via service-role auth.getUser().
//  - session_id is extracted from the JWT payload (never trusted from the body).
//  - Accepts either a typed numeric `code` OR a `token` from the confirm link.
//  - Verification uses constant-time comparison (timingSafeEqualHex).
//  - Only wrong-credential attempts count toward the per-challenge lockout (N=5).
//  - On success: marks the challenge consumed + upserts a session_elevations row.
//    The Custom Access Token Hook (T141) reads that row on every JWT refresh and
//    injects the app_2fa_at + app_2fa_channel claims into the access token.
//  - No secrets, PII, or plaintext codes are logged.
//
// LIVE ACTIVATION: requires SUPABASE_SERVICE_ROLE_KEY + VITE_SUPABASE_URL.
// The Custom Access Token Hook in Authentication > Hooks must also be enabled.
// See SECURITY.md and the T141 migration comment for the full activation steps.

import {
  hashOtp,
  hashConfirmToken,
  timingSafeEqualHex,
  isValidOtpFormat,
} from '../../src/features/auth/otpChannelLogic';
import { isSupabaseAdminConfigured, supabaseAdmin } from './_shared/supabaseAdmin';
import { extractSessionId } from './mfa-otp-request';
import { checkMfaVerifyRateLimit } from './_shared/rateLimiter';

const EMAIL_CHANNEL = 'email';
// Maximum wrong-code attempts before a challenge is considered locked.
const MAX_VERIFY_ATTEMPTS = 5;
// How long an app-managed session elevation lasts (24 hours).
const ELEVATION_TTL_MS = 24 * 60 * 60 * 1000;

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function extractBearerToken(header: string | null | undefined): string | null {
  if (!header) return null;
  const m = /^Bearer\s+(\S+)$/i.exec(header.trim());
  return m ? m[1] : null;
}

interface RequestBody {
  channel?: unknown;
  /** Typed 6-digit numeric code. Mutually exclusive with `token`. */
  code?: unknown;
  /** One-click confirm token from the email link. Mutually exclusive with `code`. */
  token?: unknown;
}

interface ChallengeRow {
  id: string;
  code_hash: string;
  code_salt: string;
  confirm_token_hash: string | null;
  attempts: number;
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return json(405, { error: 'method-not-allowed' });
  if (!isSupabaseAdminConfigured()) return json(503, { error: 'backend-not-configured' });

  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '';

  // ── Auth: resolve the caller from the bearer token ───────────────────────
  const rawToken = extractBearerToken(req.headers.get('Authorization'));
  if (!rawToken) return json(401, { error: 'missing-authorization' });

  const { data: authData, error: authErr } = await supabaseAdmin().auth.getUser(rawToken);
  if (authErr || !authData.user) return json(401, { error: 'invalid-token' });

  const userId = authData.user.id;
  const sessionId = extractSessionId(rawToken);
  if (!sessionId) return json(422, { error: 'no-session' });

  // ── IP + identity rate limit (T278) ──────────────────────────────────────
  const rlKey = `${userId}:${clientIp}`;
  if (!checkMfaVerifyRateLimit(rlKey)) {
    void supabaseAdmin()
      .from('auth_audit_events')
      .insert({ user_id: userId, asociatie_id: null, event_type: 'rateLimited', email_mask: null });
    return new Response(JSON.stringify({ error: 'rate-limited' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': '300' },
    });
  }

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

  const submittedCode = typeof body.code === 'string' ? body.code.trim() : null;
  const submittedToken = typeof body.token === 'string' ? body.token.trim() : null;

  if (!submittedCode && !submittedToken) {
    return json(400, { error: 'code-or-token-required' });
  }

  // ── Fetch the freshest eligible challenge ─────────────────────────────────
  // Eligible = non-consumed, non-expired, under the attempt ceiling, bound to
  // this session. We deliberately do NOT filter by `attempts < MAX` at query
  // time so we can return a clear 'challenge-locked' instead of 'no-challenge'.
  const { data: rows } = await supabaseAdmin()
    .from('mfa_otp_challenges')
    .select('id, code_hash, code_salt, confirm_token_hash, attempts')
    .eq('user_id', userId)
    .eq('channel', EMAIL_CHANNEL)
    .eq('session_id', sessionId)
    .is('consumed_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1);

  const challenge = (rows as ChallengeRow[] | null)?.[0];
  if (!challenge) return json(422, { error: 'no-challenge' });

  if (challenge.attempts >= MAX_VERIFY_ATTEMPTS) {
    return json(429, { error: 'challenge-locked' });
  }

  // ── Verify the submitted credential ──────────────────────────────────────
  let verified = false;

  if (submittedToken !== null) {
    // Confirm-link path: hash the token and compare in constant time.
    if (!challenge.confirm_token_hash) {
      return json(422, { error: 'no-confirm-token' });
    }
    const inputHash = await hashConfirmToken(submittedToken);
    verified = timingSafeEqualHex(inputHash, challenge.confirm_token_hash);
  } else if (submittedCode !== null) {
    // Typed-code path: salted hash + constant-time compare.
    if (!isValidOtpFormat(submittedCode)) {
      return json(422, { error: 'invalid-format' });
    }
    const inputHash = await hashOtp(submittedCode, challenge.code_salt);
    verified = timingSafeEqualHex(inputHash, challenge.code_hash);
  }

  if (!verified) {
    // Increment the per-challenge attempt counter.
    const newAttempts = challenge.attempts + 1;
    await supabaseAdmin()
      .from('mfa_otp_challenges')
      .update({ attempts: newAttempts })
      .eq('id', challenge.id);

    if (newAttempts >= MAX_VERIFY_ATTEMPTS) {
      return json(429, { error: 'challenge-locked' });
    }
    return json(422, { error: 'invalid-code', remainingAttempts: MAX_VERIFY_ATTEMPTS - newAttempts });
  }

  // ── Mark challenge consumed ───────────────────────────────────────────────
  await supabaseAdmin()
    .from('mfa_otp_challenges')
    .update({ consumed_at: new Date().toISOString() })
    .eq('id', challenge.id);

  // ── Upsert session elevation ──────────────────────────────────────────────
  // The Custom Access Token Hook reads this row on every JWT refresh and merges
  // app_2fa_at + app_2fa_channel into the access token claims.
  const elevatedAt = new Date();
  const expiresAt = new Date(elevatedAt.getTime() + ELEVATION_TTL_MS).toISOString();

  const { error: elevErr } = await supabaseAdmin()
    .from('session_elevations')
    .upsert(
      {
        user_id: userId,
        session_id: sessionId,
        channel: EMAIL_CHANNEL,
        elevated_at: elevatedAt.toISOString(),
        expires_at: expiresAt,
      },
      { onConflict: 'session_id' },
    );

  if (elevErr) return json(500, { error: 'elevation-failed' });

  return json(200, { ok: true });
};
