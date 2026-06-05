// Netlify Function: superadmin lifecycle management for an asociatie (T249).
// Transitions an asociatie between active / suspended / archived states.
//
// Security model:
//  - POST only.
//  - Requires isSupabaseAdminConfigured() (service-role key + Supabase URL).
//  - Caller resolved server-side via verifyBearerToken() -- never trusts a
//    client-supplied user id or role.
//  - Platform superadmin status re-verified server-side by querying
//    platform_admins directly via the service-role client.
//  - Payload validated server-side (valid asociatieId, known action, reason
//    required for suspend).
//
// HTTP responses:
//  405  method-not-allowed     (non-POST)
//  503  backend-not-configured (Supabase admin env missing)
//  401  unauthorized           (missing or invalid bearer token)
//  403  forbidden              (caller not in platform_admins)
//  400  invalid-json           (unparseable body)
//  422  validation-failed      (missing or invalid fields)
//  404  not-found              (asociatieId does not exist)
//  502  db-error               (update failed)
//  200  { ok: true, status, statusChangedAt }
//
// Privacy: never log user ids, PII, or the reason text verbatim.

import {
  isSupabaseAdminConfigured,
  supabaseAdmin,
  verifyBearerToken,
} from './_shared/supabaseAdmin';

type LifecycleAction = 'suspend' | 'reactivate' | 'archive';
type AsociatieStatus = 'active' | 'suspended' | 'archived';

const ACTION_TO_STATUS: Record<LifecycleAction, AsociatieStatus> = {
  suspend: 'suspended',
  reactivate: 'active',
  archive: 'archived',
};

const AUDIT_ACTION_MAP: Record<LifecycleAction, string> = {
  suspend: 'asociatie.suspended',
  reactivate: 'asociatie.reactivated',
  archive: 'asociatie.archived',
};

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

interface LifecyclePayload {
  asociatieId?: unknown;
  action?: unknown;
  reason?: unknown;
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

  let payload: LifecyclePayload;
  try {
    payload = (await req.json()) as LifecyclePayload;
  } catch {
    return json(400, { error: 'invalid-json' });
  }

  const asociatieId = typeof payload.asociatieId === 'string' ? payload.asociatieId.trim() : '';
  const action = typeof payload.action === 'string' ? payload.action.trim() : '';
  const reason = typeof payload.reason === 'string' ? payload.reason.trim() : '';

  if (!asociatieId) return json(422, { error: 'validation-failed', field: 'asociatieId' });
  if (!Object.keys(ACTION_TO_STATUS).includes(action)) {
    return json(422, { error: 'validation-failed', field: 'action' });
  }
  if (action === 'suspend' && !reason) {
    return json(422, { error: 'validation-failed', field: 'reason', detail: 'required-for-suspend' });
  }

  // Verify the asociatie exists.
  const { data: asoc } = await db
    .from('asociatii')
    .select('id, name, status')
    .eq('id', asociatieId)
    .is('deleted_at', null)
    .maybeSingle();
  if (!asoc) return json(404, { error: 'not-found' });

  const newStatus = ACTION_TO_STATUS[action as LifecycleAction];
  const now = new Date().toISOString();

  const { error: updateErr } = await db
    .from('asociatii')
    .update({
      status: newStatus,
      status_reason: reason || null,
      status_changed_at: now,
    })
    .eq('id', asociatieId);
  if (updateErr) return json(502, { error: 'db-error' });

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
    action: AUDIT_ACTION_MAP[action as LifecycleAction],
    entity: 'asociatie',
    entity_label: (asoc as { name: string }).name,
    before_value: (asoc as { status: string }).status,
    after_value: newStatus,
    prev_hash: prevHash,
    hash: prevHash,
  });

  return json(200, { ok: true, status: newStatus, statusChangedAt: now });
};
