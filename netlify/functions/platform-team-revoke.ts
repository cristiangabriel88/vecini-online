// Netlify Function: revoke a platform operator's access (T251).
//
// Security model:
//  - POST only.
//  - Requires isSupabaseAdminConfigured() (service-role key + Supabase URL).
//  - Caller resolved server-side via verifyBearerToken() -- never trusts a
//    client-supplied user id or role.
//  - Platform superadmin status re-verified server-side by querying
//    platform_admins directly via the service-role client.
//  - Guards:
//      1. Cannot remove the last remaining platform operator.
//      2. Validated targetUserId must exist in platform_admins.
//  - Deletes the platform_admins row; the user's auth account is retained
//    (they keep their auth identity but lose platform console access).
//
// HTTP responses:
//  405  method-not-allowed     (non-POST)
//  503  backend-not-configured (Supabase admin env missing)
//  401  unauthorized           (missing or invalid bearer token)
//  403  forbidden              (caller not in platform_admins)
//  400  invalid-json           (unparseable body)
//  422  validation-failed      (missing targetUserId)
//  404  not-found              (targetUserId not in platform_admins)
//  409  last-admin             (cannot remove the last platform operator)
//  502  db-error               (delete failed)
//  200  { ok: true }
//
// Privacy: never log user ids or PII.

import {
  isSupabaseAdminConfigured,
  supabaseAdmin,
  verifyBearerToken,
} from './_shared/supabaseAdmin';

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

interface RevokePayload {
  targetUserId?: unknown;
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

  let payload: RevokePayload;
  try {
    payload = (await req.json()) as RevokePayload;
  } catch {
    return json(400, { error: 'invalid-json' });
  }

  const targetUserId = typeof payload.targetUserId === 'string' ? payload.targetUserId.trim() : '';
  if (!targetUserId) return json(422, { error: 'validation-failed', field: 'targetUserId' });

  // Verify the target exists in platform_admins.
  const { data: targetRow } = await db
    .from('platform_admins')
    .select('user_id')
    .eq('user_id', targetUserId)
    .maybeSingle();
  if (!targetRow) return json(404, { error: 'not-found' });

  // Guard: cannot remove the last platform operator.
  const { count } = await db
    .from('platform_admins')
    .select('user_id', { count: 'exact', head: true });
  if ((count ?? 0) <= 1) return json(409, { error: 'last-admin' });

  const { error: deleteErr } = await db
    .from('platform_admins')
    .delete()
    .eq('user_id', targetUserId);
  if (deleteErr) return json(502, { error: 'db-error' });

  return json(200, { ok: true });
};
