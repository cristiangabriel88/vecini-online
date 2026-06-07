// Netlify Function: server-side GDPR retention-window cleanup (T72, T289).
//
// Periodically purges records that have passed their documented retention
// windows (DATA_RETENTION.md):
//   - auth_audit_events older than 12 months
//   - resolved / closed tickets where resolved_at < now() - 1 year
//
// Scheduled to run monthly (Netlify scheduled function).
// Can also be triggered manually via POST with a valid platform-admin bearer token.
//
// Security model:
//   - Scheduled invocations are triggered by Netlify (no bearer needed, no
//     external IP -- Netlify's CDN adds x-forwarded-for for every public
//     request, so an absent header reliably marks an internal scheduler call).
//   - Manual POST invocations require a valid bearer token from a platform admin
//     (re-verified against platform_admins; identical pattern to impersonate.ts).
//   - Always requires isSupabaseAdminConfigured() (service-role key present).
//   - Rate limit: 5 purge runs per hour per IP (manual trigger protection).
//
// Audit:
//   - Manual invocations are recorded in auth_audit_events (tamper-evident via
//     append-only RLS: no delete/update policy exists for any role). Scheduled
//     invocations have no actor user id; their result is captured in the
//     function's own return value, which Netlify records in its function log.
//
// HTTP responses:
//   503  backend-not-configured
//   429  rate-limited
//   401  unauthorized (manual POST with missing/invalid bearer)
//   403  forbidden (manual POST by a non-platform-admin)
//   200  { ok: true, auditEventsDeleted: number, ticketsDeleted: number }
//
// Privacy: never log user ids, email addresses, or ticket content.

import { checkSlidingWindow } from './_shared/rateLimiter';
import {
  isSupabaseAdminConfigured,
  supabaseAdmin,
  verifyBearerToken,
} from './_shared/supabaseAdmin';

// Retention windows matching DATA_RETENTION.md.
const AUTH_AUDIT_RETENTION_DAYS = 365;    // 12 months
const TICKET_RESOLVED_RETENTION_DAYS = 365; // resolution + 1 year

// Scheduled: run once per month.
export const config = { schedule: '@monthly' };

// Per-IP rate limit for manual trigger: 5 per hour.
const _purgeStore = new Map<string, { timestamps: number[] }>();
const PURGE_WINDOW_MS = 60 * 60_000;
const PURGE_MAX = 5;

function checkPurgeRateLimit(ip: string, now: number = Date.now()): boolean {
  return checkSlidingWindow(_purgeStore, ip, now, PURGE_WINDOW_MS, PURGE_MAX);
}

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

/**
 * Returns true when the request appears to be a Netlify scheduled invocation:
 * no Authorization header and no x-forwarded-for header. Netlify's CDN sets
 * x-forwarded-for on every public request, so an absent header reliably marks
 * an internal scheduler call rather than an external caller who omitted auth.
 */
export function isScheduledInvocation(req: Request): boolean {
  const hasAuth = Boolean(req.headers.get('Authorization'));
  const hasIp = Boolean(req.headers.get('x-forwarded-for')?.trim());
  return !hasAuth && !hasIp;
}

export default async (req: Request): Promise<Response> => {
  // Rate limit manual HTTP triggers; scheduled invocations don't carry IP.
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '';
  if (clientIp && !checkPurgeRateLimit(clientIp)) {
    return new Response(JSON.stringify({ error: 'rate-limited' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': '3600' },
    });
  }

  if (!isSupabaseAdminConfigured()) return json(503, { error: 'backend-not-configured' });

  // Gate manual HTTP invocations behind bearer + platform-admin check.
  // Netlify scheduled invocations carry no Authorization and no x-forwarded-for;
  // any other caller must authenticate as a platform admin.
  let actorUserId: string | null = null;
  if (!isScheduledInvocation(req)) {
    const { userId, error: authError } = await verifyBearerToken(
      req.headers.get('Authorization'),
    );
    if (!userId) return json(401, { error: authError ?? 'unauthorized' });

    // Re-verify platform-admin status server-side (mirrors impersonate.ts).
    const { data: adminRow } = await supabaseAdmin()
      .from('platform_admins')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();
    if (!adminRow) return json(403, { error: 'forbidden' });

    actorUserId = userId;
  }

  const db = supabaseAdmin();

  // Purge auth audit events older than 12 months.
  // auth_audit_events for deleted users are already gone via ON DELETE CASCADE;
  // this cleans up old events for active accounts.
  const auditCutoff = daysAgoIso(AUTH_AUDIT_RETENTION_DAYS);
  const { count: auditDeleted } = await db
    .from('auth_audit_events')
    .delete({ count: 'exact' })
    .lt('created_at', auditCutoff);

  // Purge resolved/closed tickets past their resolution + 1-year window.
  const ticketCutoff = daysAgoIso(TICKET_RESOLVED_RETENTION_DAYS);
  const { count: ticketsDeleted } = await db
    .from('tickets')
    .delete({ count: 'exact' })
    .in('status', ['rezolvat', 'verificat', 'inchis'])
    .not('resolved_at', 'is', null)
    .lt('resolved_at', ticketCutoff);

  // Audit manual purge runs into the tamper-evident auth_audit_events stream.
  // Scheduled runs have no actor; their stats are visible in the function log.
  if (actorUserId) {
    await db.from('auth_audit_events').insert({
      user_id: actorUserId,
      asociatie_id: null,
      event_type: 'platform.gdpr_purge',
      email_mask: null,
    });
  }

  return json(200, {
    ok: true,
    auditEventsDeleted: auditDeleted ?? 0,
    ticketsDeleted: ticketsDeleted ?? 0,
  });
};
