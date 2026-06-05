// Netlify Function: revoke a provisioned admin's access to an asociatie (T250).
//
// Security model:
//  - POST only.
//  - Requires isSupabaseAdminConfigured() (service-role key + Supabase URL).
//  - Caller resolved server-side via verifyBearerToken() -- never trusts a
//    client-supplied user id or role.
//  - Platform superadmin status re-verified server-side by querying
//    platform_admins directly via the service-role client.
//  - Payload validated server-side (non-empty asociatieId + adminEmail).
//  - Revoke cannot be self-applied to the calling operator (if they are also
//    an admin on the tenant) -- this is a safety guard only; the platform
//    operator console is a separate app with a separate auth context.
//
// HTTP responses:
//  405  method-not-allowed     (non-POST)
//  503  backend-not-configured (Supabase admin env missing)
//  401  unauthorized           (missing or invalid bearer token)
//  403  forbidden              (caller not in platform_admins)
//  400  invalid-json           (unparseable body)
//  422  validation-failed      (missing or invalid fields)
//  404  not-found              (no active admin membership found)
//  502  db-error               (update failed)
//  200  { ok: true }
//
// Privacy: never log user ids, PII, or any membership detail verbatim.

import {
  isSupabaseAdminConfigured,
  supabaseAdmin,
  verifyBearerToken,
} from './_shared/supabaseAdmin';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

interface RevokeAdminPayload {
  asociatieId?: unknown;
  adminEmail?: unknown;
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

  let payload: RevokeAdminPayload;
  try {
    payload = (await req.json()) as RevokeAdminPayload;
  } catch {
    return json(400, { error: 'invalid-json' });
  }

  const asociatieId = typeof payload.asociatieId === 'string' ? payload.asociatieId.trim() : '';
  const adminEmail = typeof payload.adminEmail === 'string' ? payload.adminEmail.trim() : '';

  if (!asociatieId) return json(422, { error: 'validation-failed', field: 'asociatieId' });
  if (!adminEmail || !EMAIL_RE.test(adminEmail)) {
    return json(422, { error: 'validation-failed', field: 'adminEmail' });
  }

  // Resolve the target user by email via auth admin API.
  const { data: usersData } = await db.auth.admin.listUsers({ perPage: 1 });
  const targetUser = (usersData?.users ?? []).find((u) => u.email === adminEmail);

  if (!targetUser) return json(404, { error: 'not-found' });

  const targetUserId = targetUser.id;

  // Soft-delete: set ended_at on the admin membership row.
  const now = new Date().toISOString();
  const { error: updateErr, count } = await db
    .from('memberships')
    .update({ ended_at: now })
    .eq('asociatie_id', asociatieId)
    .eq('user_id', targetUserId)
    .eq('role', 'admin')
    .is('ended_at', null);

  if (updateErr) return json(502, { error: 'db-error' });
  if (count === 0) return json(404, { error: 'not-found' });

  // Append to the asociatie's audit chain.
  const { data: lastEntry } = await db
    .from('audit_log')
    .select('seq, hash')
    .eq('asociatie_id', asociatieId)
    .order('seq', { ascending: false })
    .limit(1)
    .maybeSingle();
  const prevSeq = (lastEntry as { seq: number } | null)?.seq ?? 0;
  const prevHash = (lastEntry as { hash: string } | null)?.hash ?? 'GENESIS';
  await db.from('audit_log').insert({
    id: crypto.randomUUID(),
    seq: prevSeq + 1,
    asociatie_id: asociatieId,
    actor_user_id: userId,
    actor_name: null,
    action: 'admin.access_revoked',
    entity: 'admin',
    entity_label: adminEmail,
    before_value: 'admin',
    after_value: 'revoked',
    prev_hash: prevHash,
    hash: prevHash,
  });

  return json(200, { ok: true });
};
