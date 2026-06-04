// Netlify Function: superadmin support messenger writes (T99).
//
// Security model:
//  - POST only.
//  - Requires isSupabaseAdminConfigured().
//  - Caller resolved server-side via verifyBearerToken().
//  - Superadmin status re-verified by querying platform_admins via service-role.
//  - action 'reply': inserts a support message as 'superadmin' + reopens the thread.
//  - action 'toggle-status': flips thread status between open/resolved.
//
// This function exists because the platform RLS contract keeps is_super_admin()
// SELECT-only; writes go through the service-role key here (bypasses RLS).
//
// HTTP responses:
//  405  method-not-allowed
//  503  backend-not-configured
//  401  unauthorized (missing/invalid bearer)
//  403  forbidden (not in platform_admins)
//  422  validation-failed
//  404  not-found (thread does not exist)
//  200  { ok: true }
//
// Privacy: never log the token, user id, or message body.

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

interface SupportAdminPayload {
  action?: unknown;
  thread_id?: unknown;
  body?: unknown;
}

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

  let payload: SupportAdminPayload;
  try {
    payload = (await req.json()) as SupportAdminPayload;
  } catch {
    return json(400, { error: 'invalid-json' });
  }

  const action = typeof payload.action === 'string' ? payload.action : '';
  const threadId = typeof payload.thread_id === 'string' ? payload.thread_id.trim() : '';

  if (!threadId) return json(422, { error: 'thread_id required' });

  if (action === 'reply') {
    const messageBody = typeof payload.body === 'string' ? payload.body.trim() : '';
    if (!messageBody) return json(422, { error: 'body required' });

    // Resolve operator display name.
    const { data: profileRow } = await supabaseAdmin()
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .maybeSingle();
    const senderName =
      (profileRow as { full_name: string | null } | null)?.full_name ?? 'Platformă vecini.online';

    const now = new Date().toISOString();
    const { error: msgErr } = await supabaseAdmin().from('support_messages').insert({
      thread_id: threadId,
      sender: 'superadmin',
      sender_name: senderName,
      body: messageBody,
      created_at: now,
      read: false,
    });
    if (msgErr) return json(500, { error: 'insert-failed' });

    await supabaseAdmin()
      .from('support_threads')
      .update({ status: 'open' })
      .eq('id', threadId);

    return json(200, { ok: true });

  } else if (action === 'toggle-status') {
    const { data: threadRow, error: fetchErr } = await supabaseAdmin()
      .from('support_threads')
      .select('status')
      .eq('id', threadId)
      .maybeSingle();
    if (fetchErr || !threadRow) return json(404, { error: 'not-found' });

    const newStatus = (threadRow as { status: string }).status === 'open' ? 'resolved' : 'open';
    await supabaseAdmin()
      .from('support_threads')
      .update({ status: newStatus })
      .eq('id', threadId);

    return json(200, { ok: true, status: newStatus });

  } else {
    return json(422, { error: 'unknown-action' });
  }
};
