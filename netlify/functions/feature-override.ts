// Netlify Function: platform operator sets a per-tenant feature-flag override (T256).
// Forces a feature on or off for one asociatie, overriding the admin-managed default.
//
// Security model:
//  - POST only.
//  - Requires isSupabaseAdminConfigured() (service-role key + Supabase URL).
//  - Caller resolved server-side via verifyBearerToken() -- never trusts a
//    client-supplied user id or role.
//  - Platform superadmin status re-verified server-side by querying
//    platform_admins directly via the service-role client.
//  - Payload validated server-side.
//
// HTTP responses:
//  405  method-not-allowed
//  503  backend-not-configured
//  401  unauthorized
//  403  forbidden (caller not in platform_admins)
//  400  invalid-json
//  422  validation-failed
//  404  not-found (asociatieId does not exist)
//  502  db-error
//  200  { ok: true }

import {
  isSupabaseAdminConfigured,
  supabaseAdmin,
  verifyBearerToken,
} from './_shared/supabaseAdmin';

interface OverridePayload {
  asociatieId?: unknown;
  featureKey?: unknown;
  overrideEnabled?: unknown;
}

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
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

  let payload: OverridePayload;
  try {
    payload = (await req.json()) as OverridePayload;
  } catch {
    return json(400, { error: 'invalid-json' });
  }

  const asociatieId = typeof payload.asociatieId === 'string' ? payload.asociatieId.trim() : '';
  const featureKey = typeof payload.featureKey === 'string' ? payload.featureKey.trim() : '';
  const overrideEnabled = payload.overrideEnabled;

  if (!asociatieId) return json(422, { error: 'validation-failed', field: 'asociatieId' });
  if (!featureKey) return json(422, { error: 'validation-failed', field: 'featureKey' });
  if (overrideEnabled !== null && typeof overrideEnabled !== 'boolean') {
    return json(422, { error: 'validation-failed', field: 'overrideEnabled' });
  }

  const { data: asoc } = await db
    .from('asociatii')
    .select('id, name')
    .eq('id', asociatieId)
    .is('deleted_at', null)
    .maybeSingle();
  if (!asoc) return json(404, { error: 'not-found' });

  if (overrideEnabled === null) {
    const { error: delErr } = await db
      .from('asociatie_feature_overrides')
      .delete()
      .eq('asociatie_id', asociatieId)
      .eq('feature_key', featureKey);
    if (delErr) return json(502, { error: 'db-error' });
  } else {
    const { error: upsertErr } = await db
      .from('asociatie_feature_overrides')
      .upsert(
        {
          asociatie_id: asociatieId,
          feature_key: featureKey,
          override_enabled: overrideEnabled as boolean,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'asociatie_id,feature_key' },
      );
    if (upsertErr) return json(502, { error: 'db-error' });
  }

  const auditAction = overrideEnabled === null
    ? 'feature.override_disabled'
    : overrideEnabled
      ? 'feature.override_enabled'
      : 'feature.override_disabled';

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
    action: auditAction,
    entity: 'feature',
    entity_label: featureKey,
    before_value: null,
    after_value: overrideEnabled === null ? 'cleared' : String(overrideEnabled),
    prev_hash: prevHash,
    hash: prevHash,
  });

  return json(200, { ok: true });
};
