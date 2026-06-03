// Netlify Function: server-side GDPR erasure execution (T72).
//
// Applies the ERASURE_PLAN from gdprLogic.ts across the subject's rows for
// the specified data-subject request:
//   - anonymize: null the user_id FK on retained records (tickets, ideas, etc.)
//   - delete: remove the subject's personal records (listings, bookings, etc.)
//
// After applying the plan, the subject's membership in the asociatie is removed.
// If no other memberships remain, the Supabase auth account is also deleted.
//
// Security model:
//   - POST only.
//   - Requires isSupabaseAdminConfigured() (service-role key + Supabase URL).
//   - Caller resolved server-side via verifyBearerToken() -- never trusts a
//     client-supplied user id or role.
//   - Caller must be admin or presedinte of the request's asociatie (verified
//     server-side via isAdminOfAsociatie()).
//   - The data-subject request is re-looked-up from the DB by ID; the
//     subjectUserId and asociatieId are never accepted from the client.
//   - Rate limit: 10 erasures per hour per admin uid.
//
// HTTP responses:
//   405  method-not-allowed
//   503  backend-not-configured
//   429  rate-limited
//   401  unauthorized (missing / invalid bearer token)
//   400  invalid-json or missing requestId
//   404  request-not-found (DSR not found, not erasure type, or not completed)
//   403  forbidden (caller not admin of the DSR's asociatie)
//   200  { ok: true, deletedAuth: boolean }
//
// Privacy: never log user ids, PII, or request content.

import {
  checkSlidingWindow,
} from './_shared/rateLimiter';
import {
  isSupabaseAdminConfigured,
  supabaseAdmin,
  verifyBearerToken,
  isAdminOfAsociatie,
} from './_shared/supabaseAdmin';

// Rate limit: 10 erasure executions per hour per admin uid.
const _erasureStore = new Map<string, { timestamps: number[] }>();
const ERASURE_WINDOW_MS = 60 * 60_000;
const ERASURE_MAX = 10;

function checkErasureRateLimit(uid: string, now: number = Date.now()): boolean {
  return checkSlidingWindow(_erasureStore, uid, now, ERASURE_WINDOW_MS, ERASURE_MAX);
}

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

interface DsrRow {
  id: string;
  asociatie_id: string;
  subject_user_id: string;
  type: string;
  status: string;
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return json(405, { error: 'method-not-allowed' });

  if (!isSupabaseAdminConfigured()) return json(503, { error: 'backend-not-configured' });

  const { userId: callerId, error: authError } = await verifyBearerToken(
    req.headers.get('Authorization'),
  );
  if (!callerId) return json(401, { error: authError ?? 'unauthorized' });

  if (!checkErasureRateLimit(callerId)) {
    return new Response(JSON.stringify({ error: 'rate-limited' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': '3600' },
    });
  }

  let body: { requestId?: unknown };
  try {
    body = (await req.json()) as { requestId?: unknown };
  } catch {
    return json(400, { error: 'invalid-json' });
  }

  const requestId = typeof body.requestId === 'string' ? body.requestId.trim() : '';
  if (!requestId) return json(400, { error: 'missing-request-id' });

  const db = supabaseAdmin();

  // Look up the DSR server-side; never trust client-supplied subjectUserId.
  const { data: dsrRow } = await db
    .from('data_subject_requests')
    .select('id, asociatie_id, subject_user_id, type, status')
    .eq('id', requestId)
    .maybeSingle();

  const dsr = dsrRow as DsrRow | null;
  if (!dsr || dsr.type !== 'erasure' || dsr.status !== 'completed') {
    return json(404, { error: 'request-not-found' });
  }

  const { subject_user_id: subjectId, asociatie_id: asociatieId } = dsr;

  // Re-verify caller is admin of this specific asociatie (never trust client role).
  const isAdmin = await isAdminOfAsociatie(callerId, asociatieId);
  if (!isAdmin) return json(403, { error: 'forbidden' });

  // -----------------------------------------------------------------------
  // Phase 1: Null FKs on records that must be RETAINED (anonymize).
  // The rows stay; the identity link is severed. Scoped to this asociatie.
  // -----------------------------------------------------------------------

  await Promise.allSettled([
    db.from('tickets').update({ reporter_user_id: null }).eq('reporter_user_id', subjectId).eq('asociatie_id', asociatieId),
    db.from('tickets').update({ assigned_to_user_id: null }).eq('assigned_to_user_id', subjectId).eq('asociatie_id', asociatieId),
    db.from('ideas').update({ author_user_id: null }).eq('author_user_id', subjectId).eq('asociatie_id', asociatieId),
    db.from('discussion_messages').update({ author_user_id: null }).eq('author_user_id', subjectId).eq('asociatie_id', asociatieId),
    db.from('private_threads').update({ resident_user_id: null }).eq('resident_user_id', subjectId).eq('asociatie_id', asociatieId),
    db.from('private_messages').update({ sender_user_id: null }).eq('sender_user_id', subjectId).eq('asociatie_id', asociatieId),
    db.from('anonymous_messages').update({ sender_user_id: null }).eq('sender_user_id', subjectId).eq('asociatie_id', asociatieId),
    db.from('petitions').update({ author_user_id: null }).eq('author_user_id', subjectId).eq('asociatie_id', asociatieId),
    db.from('visitor_reports').update({ reporter_user_id: null }).eq('reporter_user_id', subjectId).eq('asociatie_id', asociatieId),
    // Retained governance records: sever identity but keep the row.
    db.from('votes').update({ voter_user_id: null }).eq('voter_user_id', subjectId).eq('asociatie_id', asociatieId),
    db.from('budget_proposals').update({ author_user_id: null }).eq('author_user_id', subjectId).eq('asociatie_id', asociatieId),
    db.from('polls').update({ author_user_id: null }).eq('author_user_id', subjectId).eq('asociatie_id', asociatieId),
    db.from('announcements').update({ author_user_id: null }).eq('author_user_id', subjectId).eq('asociatie_id', asociatieId),
    db.from('resident_posts').update({ author_user_id: null }).eq('author_user_id', subjectId).eq('asociatie_id', asociatieId),
    db.from('alerts').update({ sender_user_id: null }).eq('sender_user_id', subjectId).eq('asociatie_id', asociatieId),
    db.from('ticket_status_history').update({ changed_by: null }).eq('changed_by', subjectId),
    db.from('idea_comments').update({ author_user_id: null }).eq('author_user_id', subjectId).eq('asociatie_id', asociatieId),
  ]);

  // -----------------------------------------------------------------------
  // Phase 2: DELETE rows that belong to the subject (personal data).
  // ON DELETE CASCADE on child tables handles linked rows automatically.
  // -----------------------------------------------------------------------

  await Promise.allSettled([
    db.from('marketplace_listings').delete().eq('seller_user_id', subjectId).eq('asociatie_id', asociatieId),
    db.from('thank_yous').delete().eq('from_user_id', subjectId).eq('asociatie_id', asociatieId),
    db.from('resident_directory_consent').delete().eq('user_id', subjectId).eq('asociatie_id', asociatieId),
    db.from('birthdays_consent').delete().eq('user_id', subjectId).eq('asociatie_id', asociatieId),
    db.from('carpool_profiles').delete().eq('user_id', subjectId).eq('asociatie_id', asociatieId),
    db.from('sitter_profiles').delete().eq('user_id', subjectId).eq('asociatie_id', asociatieId),
    db.from('skill_offerings').delete().eq('user_id', subjectId).eq('asociatie_id', asociatieId),
    db.from('pets').delete().eq('owner_user_id', subjectId).eq('asociatie_id', asociatieId),
    db.from('bikes').delete().eq('owner_user_id', subjectId).eq('asociatie_id', asociatieId),
    db.from('lending_items').delete().eq('owner_user_id', subjectId).eq('asociatie_id', asociatieId),
    db.from('platform_feedback').delete().eq('user_id', subjectId).eq('anonymous', false).eq('asociatie_id', asociatieId),
    db.from('kids_age_ranges').delete().eq('user_id', subjectId).eq('asociatie_id', asociatieId),
    db.from('kids_events').delete().eq('created_by', subjectId).eq('asociatie_id', asociatieId),
    db.from('bookings').delete().eq('booked_by_user_id', subjectId).eq('asociatie_id', asociatieId),
  ]);

  // -----------------------------------------------------------------------
  // Phase 3: Remove the subject's membership for this asociatie.
  // -----------------------------------------------------------------------

  await db
    .from('memberships')
    .delete()
    .eq('user_id', subjectId)
    .eq('asociatie_id', asociatieId);

  // -----------------------------------------------------------------------
  // Phase 4: Check remaining memberships. If none, delete the auth account.
  // The auth.users delete cascades to public.users, auth_audit_events, and
  // notifications (all carry ON DELETE CASCADE on their user_id FK).
  // -----------------------------------------------------------------------

  let deletedAuth = false;
  const { count } = await db
    .from('memberships')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', subjectId);

  if ((count ?? 0) === 0) {
    const { error: deleteErr } = await db.auth.admin.deleteUser(subjectId);
    deletedAuth = !deleteErr;
  }

  return json(200, { ok: true, deletedAuth });
};
