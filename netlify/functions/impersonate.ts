// Netlify Function: server-mediated superadmin impersonation gate (T98).
//
// Security model:
//  - POST only.
//  - Requires isSupabaseAdminConfigured().
//  - Caller resolved server-side via verifyBearerToken().
//  - Superadmin status re-verified by querying platform_admins directly via the
//    service-role client (same semantics as is_super_admin() but usable under
//    the service role where auth.uid() is null).
//  - action must be 'start' or 'end'; asociatie_id must be a non-empty string.
//  - On 'start': verifies the target asociație exists, then records an
//    impersonation.started audit entry in audit_log (service-role bypass of RLS
//    so the superadmin can append to a tenant they are not a member of).
//  - On 'end': records impersonation.ended in the same way.
//  - The audit entry is chained via appendAudit() (shared helper, T290).
//
// HTTP responses:
//  405  method-not-allowed
//  503  backend-not-configured
//  401  unauthorized (missing/invalid bearer)
//  403  forbidden (not in platform_admins)
//  422  validation-failed (bad action or empty asociatie_id)
//  404  not-found (target asociație does not exist)
//  200  { ok: true, asociatie_id, asociatie_name, actor_id, actor_name }
//
// Privacy: never log the token, user id, or email.

import {
  isSupabaseAdminConfigured,
  supabaseAdmin,
  verifyBearerToken,
} from './_shared/supabaseAdmin';
import { appendAudit } from './_shared/appendAudit';

// ── Helpers ───────────────────────────────────────────────────────────────────

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

interface ImpersonatePayload {
  action?: unknown;
  asociatie_id?: unknown;
}

// ── Handler ───────────────────────────────────────────────────────────────────

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return json(405, { error: 'method-not-allowed' });
  if (!isSupabaseAdminConfigured()) return json(503, { error: 'backend-not-configured' });

  const { userId, error: authError } = await verifyBearerToken(req.headers.get('Authorization'));
  if (!userId) return json(401, { error: authError ?? 'unauthorized' });

  // Re-verify superadmin status server-side.
  const { data: adminRow } = await supabaseAdmin()
    .from('platform_admins')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (!adminRow) return json(403, { error: 'forbidden' });

  let body: ImpersonatePayload;
  try {
    body = (await req.json()) as ImpersonatePayload;
  } catch {
    return json(400, { error: 'invalid-json' });
  }

  const action = typeof body.action === 'string' ? body.action : '';
  const asociatieId = typeof body.asociatie_id === 'string' ? body.asociatie_id.trim() : '';

  if ((action !== 'start' && action !== 'end') || !asociatieId) {
    return json(422, { error: 'validation-failed' });
  }

  // Fetch the target asociație name (also validates it exists).
  const { data: asocRow } = await supabaseAdmin()
    .from('asociatii')
    .select('name')
    .eq('id', asociatieId)
    .maybeSingle();
  if (!asocRow) return json(404, { error: 'not-found' });
  const asociatieName = (asocRow as { name: string }).name;

  // Resolve actor display name from profiles.
  const { data: profileRow } = await supabaseAdmin()
    .from('profiles')
    .select('full_name')
    .eq('id', userId)
    .maybeSingle();
  const actorName = (profileRow as { full_name: string | null } | null)?.full_name ?? 'Platform operator';

  const auditAction = action === 'start' ? 'impersonation.started' : 'impersonation.ended';
  const auditErr = await appendAudit(supabaseAdmin(), {
    asociatie_id: asociatieId,
    actor_user_id: userId,
    actor_name: actorName,
    action: auditAction,
    entity: 'impersonation',
    entity_label: asociatieName,
    before_value: null,
    after_value: action,
  });
  if (auditErr.error) return json(502, { error: 'audit-error' });

  return json(200, {
    ok: true,
    asociatie_id: asociatieId,
    asociatie_name: asociatieName,
    actor_id: userId,
    actor_name: actorName,
  });
};
