// Netlify Function: platform broadcast publish / expire (T253).
// Superadmins can publish a new broadcast or expire an existing one.
//
// Security model:
//  - POST only.
//  - Requires isSupabaseAdminConfigured() (service-role key + Supabase URL).
//  - Caller resolved server-side via verifyBearerToken().
//  - Platform superadmin re-verified by querying platform_admins.
//  - Payload validated (known action, required fields per action).
//
// HTTP responses:
//  405  method-not-allowed
//  503  backend-not-configured
//  401  unauthorized
//  403  forbidden
//  400  invalid-json
//  422  validation-failed
//  404  not-found (expire only, when broadcast id does not exist)
//  502  db-error
//  200  { ok: true, id, ...fields }
//
// Privacy: never log user ids, PII, or broadcast content verbatim.

import {
  isSupabaseAdminConfigured,
  supabaseAdmin,
  verifyBearerToken,
} from './_shared/supabaseAdmin';

const VALID_SEVERITIES = ['info', 'warning', 'critical'] as const;
const VALID_TARGETS = ['all', 'admin'] as const;

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

interface BroadcastPayload {
  action?: unknown;
  title?: unknown;
  body?: unknown;
  severity?: unknown;
  target?: unknown;
  endsAt?: unknown;
  id?: unknown;
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

  let payload: BroadcastPayload;
  try {
    payload = (await req.json()) as BroadcastPayload;
  } catch {
    return json(400, { error: 'invalid-json' });
  }

  const action = typeof payload.action === 'string' ? payload.action.trim() : '';
  if (action !== 'publish' && action !== 'expire') {
    return json(422, { error: 'validation-failed', field: 'action' });
  }

  if (action === 'publish') {
    const title = typeof payload.title === 'string' ? payload.title.trim() : '';
    const body = typeof payload.body === 'string' ? payload.body.trim() : '';
    const severity = typeof payload.severity === 'string' ? payload.severity.trim() : '';
    const target = typeof payload.target === 'string' ? payload.target.trim() : 'all';
    const endsAt = typeof payload.endsAt === 'string' ? payload.endsAt : null;

    if (!title) return json(422, { error: 'validation-failed', field: 'title' });
    if (!body) return json(422, { error: 'validation-failed', field: 'body' });
    if (!(VALID_SEVERITIES as readonly string[]).includes(severity)) {
      return json(422, { error: 'validation-failed', field: 'severity' });
    }
    if (!(VALID_TARGETS as readonly string[]).includes(target)) {
      return json(422, { error: 'validation-failed', field: 'target' });
    }

    const { data, error: insertErr } = await db
      .from('platform_broadcasts')
      .insert({
        title,
        body,
        severity,
        target,
        ends_at: endsAt,
        created_by: userId,
      })
      .select('id, created_at')
      .single();
    if (insertErr || !data) return json(502, { error: 'db-error' });

    const broadcastId = (data as { id: string }).id;

    // Audit via the platform audit stream (seq 0 = platform-scoped; no asociatie_id).
    const { data: lastEntry } = await db
      .from('audit_log')
      .select('seq, hash')
      .is('asociatie_id', null)
      .order('seq', { ascending: false })
      .limit(1)
      .maybeSingle();

    const prevSeq = (lastEntry as { seq: number } | null)?.seq ?? 0;
    const prevHash = (lastEntry as { hash: string } | null)?.hash ?? 'GENESIS';

    await db.from('audit_log').insert({
      id: crypto.randomUUID(),
      seq: prevSeq + 1,
      asociatie_id: null,
      actor_user_id: userId,
      actor_name: null,
      action: 'broadcast.published',
      entity: 'broadcast',
      entity_label: title.slice(0, 80),
      before_value: null,
      after_value: severity,
      prev_hash: prevHash,
      hash: prevHash,
    });

    return json(200, { ok: true, id: broadcastId });
  }

  // action === 'expire'
  const id = typeof payload.id === 'string' ? payload.id.trim() : '';
  if (!id) return json(422, { error: 'validation-failed', field: 'id' });

  const { data: existing } = await db
    .from('platform_broadcasts')
    .select('id, title')
    .eq('id', id)
    .is('expired_at', null)
    .maybeSingle();
  if (!existing) return json(404, { error: 'not-found' });

  const now = new Date().toISOString();
  const { error: updateErr } = await db
    .from('platform_broadcasts')
    .update({ expired_at: now })
    .eq('id', id);
  if (updateErr) return json(502, { error: 'db-error' });

  const { data: lastEntry2 } = await db
    .from('audit_log')
    .select('seq, hash')
    .is('asociatie_id', null)
    .order('seq', { ascending: false })
    .limit(1)
    .maybeSingle();

  const prevSeq2 = (lastEntry2 as { seq: number } | null)?.seq ?? 0;
  const prevHash2 = (lastEntry2 as { hash: string } | null)?.hash ?? 'GENESIS';

  await db.from('audit_log').insert({
    id: crypto.randomUUID(),
    seq: prevSeq2 + 1,
    asociatie_id: null,
    actor_user_id: userId,
    actor_name: null,
    action: 'broadcast.expired',
    entity: 'broadcast',
    entity_label: ((existing as { title: string }).title ?? '').slice(0, 80),
    before_value: 'active',
    after_value: 'expired',
    prev_hash: prevHash2,
    hash: prevHash2,
  });

  return json(200, { ok: true, id, expiredAt: now });
};
