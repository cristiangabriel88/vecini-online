// Netlify Function: list all admin-setup invite_codes for the platform console (T298).
//
// Security model:
//  - GET only (read-only list; no mutations).
//  - Requires isSupabaseAdminConfigured() (service-role key + Supabase URL).
//  - Caller resolved server-side via verifyBearerToken() -- never trusts a
//    client-supplied user id or role.
//  - Platform superadmin status re-verified server-side by querying
//    platform_admins directly via the service-role client.
//
// HTTP responses:
//  405  method-not-allowed     (non-GET)
//  503  backend-not-configured (Supabase admin env missing)
//  401  unauthorized           (missing or invalid bearer token)
//  403  forbidden              (caller not in platform_admins)
//  502  db-error               (query failed)
//  200  { invites: InviteRow[] }
//
// Privacy: token and code columns are NEVER returned -- only metadata a
// superadmin needs to manage the invite lifecycle (id for resend/revoke,
// status fields for display).

import {
  isSupabaseAdminConfigured,
  supabaseAdmin,
  verifyBearerToken,
} from './_shared/supabaseAdmin';

/** Shape of one row returned to the caller. No token/code ever leaves here. */
interface InviteRow {
  id: string;
  asociatieId: string;
  inviteeName: string | null;
  inviteeEmail: string | null;
  expiresAt: string;
  consumedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  emailSentAt: string | null;
}

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'GET') return json(405, { error: 'method-not-allowed' });

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

  const { data, error: queryErr } = await db
    .from('invite_codes')
    .select(
      'id, asociatie_id, invitee_name, invitee_email, expires_at, consumed_at, revoked_at, created_at, invite_email_sent_at',
    )
    .eq('kind', 'admin_setup')
    .order('created_at', { ascending: true });

  if (queryErr) return json(502, { error: 'db-error' });

  const invites: InviteRow[] = ((data ?? []) as Array<{
    id: string;
    asociatie_id: string;
    invitee_name: string | null;
    invitee_email: string | null;
    expires_at: string;
    consumed_at: string | null;
    revoked_at: string | null;
    created_at: string;
    invite_email_sent_at: string | null;
  }>).map((row) => ({
    id: row.id,
    asociatieId: row.asociatie_id,
    inviteeName: row.invitee_name,
    inviteeEmail: row.invitee_email,
    expiresAt: row.expires_at,
    consumedAt: row.consumed_at,
    revokedAt: row.revoked_at,
    createdAt: row.created_at,
    emailSentAt: row.invite_email_sent_at,
  }));

  return json(200, { invites });
};
