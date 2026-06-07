// Service-role Supabase client for privileged Netlify functions (T148).
//
// The service-role key bypasses RLS and must never be sent to browsers, logged,
// or exposed in responses. Functions using this module must always re-verify the
// caller's identity via `verifyBearerToken` before performing any write or read
// on behalf of a user.
//
// Privacy: this module never logs user ids, tokens, or email addresses.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { assertServerConfig } from './configValidator';

// Run once per Lambda cold-start. Logs any misconfigured or missing required
// env vars so they surface in function logs rather than as silent failures.
if (!process.env.VITEST) {
  assertServerConfig();
}

/** True when the service-role key and Supabase URL are both present. */
export function isSupabaseAdminConfigured(): boolean {
  return Boolean(process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

let _client: SupabaseClient | null = null;

/**
 * Lazily initialised service-role Supabase client.
 * Call only after `isSupabaseAdminConfigured()` returns true.
 */
export function supabaseAdmin(): SupabaseClient {
  if (_client) return _client;
  _client = createClient(
    process.env.VITE_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  return _client;
}

export interface BearerVerifyResult {
  userId: string | null;
  error?: string;
}

/**
 * Extract a bearer JWT from an Authorization header and verify it server-side
 * via `auth.getUser()`, returning the trusted user id. Never accept a user id
 * supplied by the client -- only the one returned here is trustworthy.
 */
export async function verifyBearerToken(
  authHeader: string | null | undefined,
): Promise<BearerVerifyResult> {
  if (!authHeader) return { userId: null, error: 'missing-authorization' };
  const match = /^Bearer\s+(\S+)$/i.exec(authHeader.trim());
  if (!match) return { userId: null, error: 'invalid-authorization' };
  const token = match[1];
  const { data, error } = await supabaseAdmin().auth.getUser(token);
  if (error || !data.user) return { userId: null, error: 'invalid-token' };
  return { userId: data.user.id };
}

/**
 * Returns true when `userId` holds an active admin or presedinte membership
 * in `asociatieId`. Uses the service-role client so RLS is bypassed and the
 * check is authoritative, not advisory.
 */
export async function isAdminOfAsociatie(
  userId: string,
  asociatieId: string,
): Promise<boolean> {
  const { data } = await supabaseAdmin()
    .from('memberships')
    .select('id')
    .eq('user_id', userId)
    .eq('asociatie_id', asociatieId)
    .in('role', ['admin', 'presedinte'])
    .is('ended_at', null)
    .limit(1);
  return Array.isArray(data) && data.length > 0;
}

/**
 * Fetch a single invite_codes row by id using the service role (bypasses RLS).
 * Returns null when the row does not exist. The caller must verify that the
 * returned asociatie_id matches the association the caller administers before
 * acting on the result.
 */
export interface InviteRow {
  id: string;
  asociatie_id: string;
  invitee_email: string | null;
  invitee_name: string | null;
  token: string | null;
  consumed_at: string | null;
  revoked_at: string | null;
  expires_at: string | null;
}

export async function getInviteById(inviteId: string): Promise<InviteRow | null> {
  const { data } = await supabaseAdmin()
    .from('invite_codes')
    .select(
      'id, asociatie_id, invitee_email, invitee_name, token, consumed_at, revoked_at, expires_at',
    )
    .eq('id', inviteId)
    .maybeSingle();
  return (data as InviteRow | null) ?? null;
}

/**
 * Fetch the display name of an asociație by id. Returns null when not found.
 * Never exposed to the client; used to populate the email template.
 */
export async function getAsociatieName(asociatieId: string): Promise<string | null> {
  const { data } = await supabaseAdmin()
    .from('asociatii')
    .select('name')
    .eq('id', asociatieId)
    .maybeSingle();
  return (data as { name: string } | null)?.name ?? null;
}
