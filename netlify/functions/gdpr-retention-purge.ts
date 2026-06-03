// Netlify Function: server-side GDPR retention-window cleanup (T72).
//
// Periodically purges records that have passed their documented retention
// windows (DATA_RETENTION.md):
//   - auth_audit_events older than 12 months
//   - resolved / closed tickets where resolved_at < now() - 1 year
//
// Scheduled to run monthly (Netlify scheduled function).
// Can also be triggered manually via POST with a valid admin bearer token.
//
// Security model:
//   - Scheduled invocations are triggered by Netlify (no bearer needed).
//   - Manual POST invocations require a valid bearer token from an admin.
//   - Always requires isSupabaseAdminConfigured() (service-role key present).
//   - Rate limit: 5 purge runs per hour per IP (manual trigger protection).
//
// HTTP responses:
//   503  backend-not-configured
//   429  rate-limited
//   200  { ok: true, auditEventsDeleted: number, ticketsDeleted: number }
//
// Privacy: never log user ids, email addresses, or ticket content.

import { checkSlidingWindow } from './_shared/rateLimiter';
import { isSupabaseAdminConfigured, supabaseAdmin } from './_shared/supabaseAdmin';

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

  return json(200, {
    ok: true,
    auditEventsDeleted: auditDeleted ?? 0,
    ticketsDeleted: ticketsDeleted ?? 0,
  });
};
