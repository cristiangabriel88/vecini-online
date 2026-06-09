// Netlify Function: platform-admin reset of a user's 2FA factors (T297).
//
// Support action for the total-lockout fallback: a user who has lost BOTH their
// TOTP authenticator AND access to their recovery-email cannot self-recover.
// This function lets a platform superadmin wipe all of that user's 2FA state so
// they fall back to password-only login and can re-enrol normally.
//
// What is cleared:
//  - auth.mfa_factors     -- TOTP enrollments (Supabase managed)
//  - mfa_channels         -- email/Telegram channel enrollments
//  - mfa_recovery_codes   -- one-time recovery code hashes
//  - session_elevations   -- active elevated-session records
//
// Security model:
//  - POST only.
//  - Requires isSupabaseAdminConfigured() (service-role key + Supabase URL).
//  - Caller resolved server-side via verifyBearerToken().
//  - Platform superadmin re-verified by querying platform_admins.
//  - Rate-limited: 5 resets per operator per 60 minutes.
//  - Audited into the platform tamper-evident chain via appendAudit.
//
// HTTP responses:
//  405  method-not-allowed
//  503  backend-not-configured
//  429  rate-limited
//  401  unauthorized
//  403  forbidden
//  400  invalid-json
//  422  validation-failed
//  404  not-found (email not in auth.users)
//  502  db-error
//  200  { ok: true }
//
// Privacy: never log tokens, user ids, or email addresses verbatim.
// The audit entry uses only the masked email hint (first 2 chars + domain).

import {
  isSupabaseAdminConfigured,
  supabaseAdmin,
  verifyBearerToken,
} from './_shared/supabaseAdmin';
import { appendAudit } from './_shared/appendAudit';
import { checkMfaResetRateLimit } from './_shared/rateLimiter';
import { resolveSupabaseUrl } from '../../src/shared/lib/supabaseUrl';

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Mask an email for audit purposes: "ab***@example.com". */
export function maskEmail(email: string): string {
  const at = email.indexOf('@');
  if (at < 2) return '***';
  return `${email.slice(0, 2)}***${email.slice(at)}`;
}

interface ResetPayload {
  email?: unknown;
}

interface GoTrueUser {
  id: string;
  email?: string;
}

interface GoTrueListResponse {
  users?: GoTrueUser[];
}

/** Look up a GoTrue user by exact email via the admin REST API. */
async function getUserByEmail(email: string): Promise<GoTrueUser | null> {
  const supabaseUrl = resolveSupabaseUrl(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_APP_STAGE,
  );
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  const resp = await fetch(
    `${supabaseUrl}/auth/v1/admin/users?filter=${encodeURIComponent(email)}&page=1&per_page=20`,
    {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    },
  );
  if (!resp.ok) return null;
  const data = (await resp.json()) as GoTrueListResponse;
  return (
    (data.users ?? []).find(
      (u: GoTrueUser) => u.email?.toLowerCase() === email,
    ) ?? null
  );
}

interface MfaFactor {
  id: string;
  factor_type?: string;
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return json(405, { error: 'method-not-allowed' });
  if (!isSupabaseAdminConfigured()) return json(503, { error: 'backend-not-configured' });

  const { userId, error: authError } = await verifyBearerToken(
    req.headers.get('Authorization'),
  );
  if (!userId) return json(401, { error: authError ?? 'unauthorized' });

  if (!checkMfaResetRateLimit(userId)) {
    return json(429, { error: 'rate-limited' });
  }

  const db = supabaseAdmin();

  const { data: adminRow } = await db
    .from('platform_admins')
    .select('user_id, name')
    .eq('user_id', userId)
    .maybeSingle();
  if (!adminRow) return json(403, { error: 'forbidden' });

  let payload: ResetPayload;
  try {
    payload = (await req.json()) as ResetPayload;
  } catch {
    return json(400, { error: 'invalid-json' });
  }

  const email =
    typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
  if (!email || !email.includes('@')) {
    return json(422, { error: 'validation-failed', field: 'email' });
  }

  // Resolve the target user by exact email match.
  let targetUser: GoTrueUser | null;
  try {
    targetUser = await getUserByEmail(email);
  } catch {
    return json(502, { error: 'db-error' });
  }
  if (!targetUser) return json(404, { error: 'not-found' });

  const targetUserId = targetUser.id;

  // Delete TOTP factors from Supabase auth (auth.mfa_factors table).
  const { data: factorsData } = await db.auth.admin.mfa.listFactors({
    userId: targetUserId,
  });
  const factors: MfaFactor[] =
    ((factorsData as { factors?: MfaFactor[] } | null)?.factors) ?? [];
  for (const factor of factors) {
    await db.auth.admin.mfa.deleteFactor({
      userId: targetUserId,
      id: factor.id,
    });
  }

  // Delete app-managed 2FA state from public tables.
  const [chErr, rcErr, seErr] = await Promise.all([
    db.from('mfa_channels').delete().eq('user_id', targetUserId),
    db.from('mfa_recovery_codes').delete().eq('user_id', targetUserId),
    db.from('session_elevations').delete().eq('user_id', targetUserId),
  ]).then(([ch, rc, se]) => [ch.error, rc.error, se.error]);

  if (chErr || rcErr || seErr) return json(502, { error: 'db-error' });

  const actorName = (adminRow as { name?: string }).name ?? null;
  const label = maskEmail(email);

  const auditErr = await appendAudit(db, {
    asociatie_id: null,
    actor_user_id: userId,
    actor_name: actorName,
    action: 'platform.mfa_reset',
    entity: 'admin',
    entity_label: label,
    before_value: `factors:${factors.length}`,
    after_value: 'cleared',
  });
  if (auditErr.error) return json(502, { error: 'audit-error' });

  return json(200, { ok: true });
};
