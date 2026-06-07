// Netlify Function: verify a single-use recovery code and elevate the session (T29).
//
// Security model:
//  - Requires `Authorization: Bearer <access_token>` from the caller.
//  - user_id is resolved server-side via service-role auth.getUser() -- never
//    trusted from the client.
//  - session_id is extracted from the JWT payload (not supplied by the client).
//  - Per-session DB-backed attempt limit: max 5 wrong attempts per session (T81).
//    The counter lives in `mfa_recovery_attempt_counts` so it is global across
//    Lambda instances and cannot be reset by clearing localStorage.
//  - Constant-time comparison (timingSafeEqualHex) prevents timing-oracle attacks.
//  - On success: the matched mfa_recovery_codes row is deleted (single-use) and
//    a session_elevations row is upserted (channel='recovery') so the Custom
//    Access Token Hook (T141) injects app_2fa_at + app_2fa_channel claims on the
//    next JWT refresh.
//  - No secrets, PII, or plaintext codes are logged.
//
// LIVE ACTIVATION: requires SUPABASE_SERVICE_ROLE_KEY + VITE_SUPABASE_URL.
// The Custom Access Token Hook in Authentication > Hooks must also be enabled.
// See SECURITY.md and the T141 migration comment for the full activation steps.

import { timingSafeEqualHex } from '../../src/features/auth/otpChannelLogic';
import { extractSessionId } from './mfa-otp-request';
import { isSupabaseAdminConfigured, supabaseAdmin } from './_shared/supabaseAdmin';
import { checkMfaVerifyRateLimit } from './_shared/rateLimiter';

// Maximum wrong-code attempts per session before recovery is locked.
const MAX_ATTEMPTS = 5;
// How long an app-managed session elevation lasts (24 hours, matching OTP path).
const ELEVATION_TTL_MS = 24 * 60 * 60 * 1000;

// ── Recovery-code hashing (inlined from mfaLogic to avoid @/ alias in node) ──

/** Canonicalise a recovery code for comparison (strip spaces/dashes, upper-case). */
function normalizeRecoveryCode(code: string): string {
  return code.replace(/[\s-]/g, '').toUpperCase();
}

/** SHA-256 hex digest of a normalised recovery code. */
async function hashRecoveryCode(code: string): Promise<string> {
  const data = new TextEncoder().encode(normalizeRecoveryCode(code));
  const digest = await globalThis.crypto.subtle.digest(
    'SHA-256',
    (() => {
      const ab = new ArrayBuffer(data.byteLength);
      new Uint8Array(ab).set(data);
      return ab;
    })(),
  );
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Extract the raw JWT string from an `Authorization: Bearer <token>` header. */
export function extractBearerToken(header: string | null | undefined): string | null {
  if (!header) return null;
  const m = /^Bearer\s+(\S+)$/i.exec(header.trim());
  return m ? m[1] : null;
}

interface RequestBody {
  code?: unknown;
}

interface RecoveryCodeRow {
  id: string;
  code_hash: string;
}

interface RecoveryAttemptRow {
  attempts: number;
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return json(405, { error: 'method-not-allowed' });
  if (!isSupabaseAdminConfigured()) return json(503, { error: 'backend-not-configured' });

  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '';

  // ── Auth: resolve caller from bearer token ────────────────────────────────
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

  // ── DB-backed per-session attempt limit (T81) ─────────────────────────────
  // Reads the persisted wrong-attempt counter from `mfa_recovery_attempt_counts`
  // so the budget survives Lambda cold starts and cannot be reset client-side.
  const { data: attemptRow } = await supabaseAdmin()
    .from('mfa_recovery_attempt_counts')
    .select('attempts')
    .eq('user_id', userId)
    .eq('session_id', sessionId)
    .maybeSingle();

  const currentAttempts = (attemptRow as RecoveryAttemptRow | null)?.attempts ?? 0;
  if (currentAttempts >= MAX_ATTEMPTS) {
    return json(429, { error: 'attempt-limit-exceeded' });
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return json(400, { error: 'invalid-json' });
  }

  const submittedCode = typeof body.code === 'string' ? body.code.trim() : null;
  if (!submittedCode) return json(400, { error: 'code-required' });

  // ── Hash submitted code and compare against stored hashes ─────────────────
  // hashRecoveryCode normalises (strip dashes/spaces, upper-case) before SHA-256.
  // We fetch all of this user's recovery-code hashes and compare in constant
  // time to avoid leaking whether any individual hash matches.
  const submittedHash = await hashRecoveryCode(submittedCode);

  const { data: rows } = await supabaseAdmin()
    .from('mfa_recovery_codes')
    .select('id, code_hash')
    .eq('user_id', userId);

  const match = (rows as RecoveryCodeRow[] | null)?.find(
    (r) => timingSafeEqualHex(submittedHash, r.code_hash),
  );

  if (!match) {
    // Increment the DB-backed attempt counter (atomic upsert via SECURITY DEFINER RPC).
    await supabaseAdmin().rpc('increment_recovery_attempts', {
      p_user_id: userId,
      p_session_id: sessionId,
    });
    return json(422, { error: 'invalid-code' });
  }

  // ── Consume the code: delete the matched row (single-use) ─────────────────
  await supabaseAdmin().from('mfa_recovery_codes').delete().eq('id', match.id);

  // ── Upsert session elevation ──────────────────────────────────────────────
  // The Custom Access Token Hook reads this row on every JWT refresh and merges
  // app_2fa_at + app_2fa_channel ('recovery') into the access-token claims.
  const elevatedAt = new Date();
  const expiresAt = new Date(elevatedAt.getTime() + ELEVATION_TTL_MS).toISOString();

  const { error: elevErr } = await supabaseAdmin()
    .from('session_elevations')
    .upsert(
      {
        user_id: userId,
        session_id: sessionId,
        channel: 'recovery',
        elevated_at: elevatedAt.toISOString(),
        expires_at: expiresAt,
      },
      { onConflict: 'session_id' },
    );

  if (elevErr) return json(500, { error: 'elevation-failed' });

  return json(200, { ok: true });
};
