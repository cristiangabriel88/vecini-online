// Netlify Function: invite a new platform operator account (T251).
//
// Security model:
//  - POST only.
//  - Requires isSupabaseAdminConfigured() (service-role key + Supabase URL).
//  - Caller resolved server-side via verifyBearerToken() -- never trusts a
//    client-supplied user id or role.
//  - Platform superadmin status re-verified server-side by querying
//    platform_admins directly via the service-role client.
//  - Payload validated server-side (name >= 2 chars, valid email).
//  - Uses auth.admin.inviteUserByEmail to create the new operator account and
//    send the setup email (Supabase handles the invite email).
//  - Inserts into platform_admins after successful user creation.
//  - Guards against inviting an email already in platform_admins.
//
// HTTP responses:
//  405  method-not-allowed     (non-POST)
//  503  backend-not-configured (Supabase admin env missing)
//  401  unauthorized           (missing or invalid bearer token)
//  403  forbidden              (caller not in platform_admins)
//  400  invalid-json           (unparseable body)
//  422  validation-failed      (name / email)
//  409  already-admin          (email already in platform_admins)
//  502  db-error               (invite or insert failed)
//  200  { ok: true }
//
// Privacy: never log the email address, user id, or any PII.

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

interface InvitePayload {
  name?: unknown;
  email?: unknown;
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

  let payload: InvitePayload;
  try {
    payload = (await req.json()) as InvitePayload;
  } catch {
    return json(400, { error: 'invalid-json' });
  }

  const name = typeof payload.name === 'string' ? payload.name.trim() : '';
  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';

  if (!name || name.length < 2) return json(422, { error: 'validation-failed', field: 'name' });
  if (!email || !EMAIL_RE.test(email)) return json(422, { error: 'validation-failed', field: 'email' });

  // Guard: email must not already be in the platform_admins roster.
  const { data: existing } = await db
    .from('platform_admins')
    .select('user_id')
    .eq('email', email)
    .maybeSingle();
  if (existing) return json(409, { error: 'already-admin' });

  // Invite the user via Supabase Auth admin API.
  // This creates the account (or resends the invite if they already exist in
  // auth.users) and sends the invite email with the configured redirect URL.
  const platformUrl = (process.env.PLATFORM_URL ?? process.env.APP_URL ?? 'https://vecini.online').replace(/\/+$/, '');
  const { data: inviteData, error: inviteErr } = await db.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${platformUrl}/consola`,
  });
  if (inviteErr || !inviteData?.user) return json(502, { error: 'db-error' });

  const newUserId = inviteData.user.id;

  // Insert into platform_admins.
  const { error: insertErr } = await db.from('platform_admins').insert({
    user_id: newUserId,
    name,
    email,
    granted_by: userId,
  });
  if (insertErr) return json(502, { error: 'db-error' });

  return json(200, { ok: true });
};
