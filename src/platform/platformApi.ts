import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { reportError } from '@/shared/lib/errorReporting';
import {
  type AuditEntry,
  type AuditAction,
  type AuditEntity,
  GENESIS_HASH,
} from '@/features/audit/auditLogic';
import type { SupportMessage, SupportThread } from '@/shared/types/domain';
import { type PlatformAsociatieSummary, type PlatformTeamAdmin } from './demoPlatform';
import { usePlatformAsociatiiStore } from './platformAsociatiiStore';
import { usePlatformAuditStore } from './platformAuditStore';
import { type PlatformErrorReport, usePlatformErrorStore } from './platformErrorStore';
import { type AssocUsageMetric, deriveHealthStatus, usePlatformUsageStore } from './platformUsageStore';
import { usePlatformMessengerStore } from './platformMessengerStore';
import { usePlatformTeamStore } from './platformTeamStore';
import { type PlatformBroadcast } from './demoPlatform';
import { usePlatformBroadcastStore } from './platformBroadcastStore';

type RowWithAsoc = { asociatie_id: string };
type SignInRow = { asociatie_id: string | null; created_at: string };

interface DbAuditRow {
  id: string;
  seq: number | null;
  asociatie_id: string;
  actor_user_id: string;
  actor_name: string | null;
  action: string | null;
  entity: string | null;
  entity_label: string | null;
  before_value: string | null;
  after_value: string | null;
  created_at: string;
  prev_hash: string | null;
  hash: string | null;
}

function rowToAuditEntry(row: DbAuditRow): AuditEntry {
  return {
    id: row.id,
    seq: row.seq ?? 0,
    asociatie_id: row.asociatie_id,
    actor_user_id: row.actor_user_id,
    actor_name: row.actor_name ?? '',
    action: (row.action ?? 'feature.enabled') as AuditAction,
    entity: (row.entity ?? 'feature') as AuditEntity,
    entity_label: row.entity_label ?? '',
    before: row.before_value,
    after: row.after_value,
    at: row.created_at,
    prev_hash: row.prev_hash ?? GENESIS_HASH,
    hash: row.hash ?? GENESIS_HASH,
  };
}

function groupCount(rows: RowWithAsoc[]): Record<string, number> {
  return rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.asociatie_id] = (acc[r.asociatie_id] ?? 0) + 1;
    return acc;
  }, {});
}

function groupLatest(rows: SignInRow[]): Record<string, string> {
  return rows.reduce<Record<string, string>>((acc, r) => {
    if (!r.asociatie_id) return acc;
    if (!acc[r.asociatie_id] || r.created_at > acc[r.asociatie_id]) {
      acc[r.asociatie_id] = r.created_at;
    }
    return acc;
  }, {});
}

/**
 * Load the full platform asociatii list (T120) using the super_admin cross-tenant
 * RLS policies. Fetches asociatii, member counts, apartment counts, and last
 * sign-in per asociatie. Updates the platform store on success.
 * No-op when Supabase is not configured (demo/offline mode).
 */
export async function hydrateAsociatiiList(): Promise<void> {
  if (!isSupabaseConfigured) return;

  usePlatformAsociatiiStore.getState().setFetchError(null);

  try {
    const [
      { data: asocRows, error: asocErr },
      { data: memberRows },
      { data: aptRows },
      { data: signInRows },
    ] = await Promise.all([
      supabase
        .from('asociatii')
        .select('id, name, address, cui, iban, contact_phone, contact_email, status, status_reason, status_changed_at')
        .is('deleted_at', null)
        .order('name'),
      supabase
        .from('memberships')
        .select('asociatie_id')
        .is('ended_at', null)
        .neq('role', 'super_admin'),
      supabase
        .from('apartments')
        .select('asociatie_id')
        .eq('is_active', true),
      supabase
        .from('auth_audit_events')
        .select('asociatie_id, created_at')
        .eq('event_type', 'sign_in')
        .order('created_at', { ascending: false })
        .limit(500),
    ]);

    if (asocErr) {
      usePlatformAsociatiiStore.getState().setFetchError('load');
      reportError(new Error(asocErr.message), { source: 'platformApi.hydrateAsociatiiList' });
      return;
    }

    const memberCounts = groupCount((memberRows ?? []) as RowWithAsoc[]);
    const aptCounts = groupCount((aptRows ?? []) as RowWithAsoc[]);
    const lastSignIn = groupLatest((signInRows ?? []) as SignInRow[]);

    const rows: PlatformAsociatieSummary[] = (asocRows ?? []).map((a) => ({
      id: a.id as string,
      name: a.name as string,
      city: '',
      members: memberCounts[a.id as string] ?? 0,
      apartments: aptCounts[a.id as string] ?? 0,
      lastAdminSignInAt: lastSignIn[a.id as string] ?? null,
      address: (a.address as string | null) ?? undefined,
      cui: (a.cui as string | null) ?? undefined,
      iban: (a.iban as string | null) ?? undefined,
      contactPhone: (a.contact_phone as string | null) ?? undefined,
      contactEmail: (a.contact_email as string | null) ?? undefined,
      status: ((a.status as string | null) ?? 'active') as import('./demoPlatform').AsociatieStatus,
      statusReason: (a.status_reason as string | null) ?? undefined,
      statusChangedAt: (a.status_changed_at as string | null) ?? undefined,
    }));

    usePlatformAsociatiiStore.getState().replaceAsociatii(rows);
  } catch (err) {
    usePlatformAsociatiiStore.getState().setFetchError('load');
    reportError(err instanceof Error ? err : new Error(String(err)), {
      source: 'platformApi.hydrateAsociatiiList',
    });
  }
}

/**
 * Load the full cross-tenant audit log (T95) using the super_admin RLS policy
 * that grants reads on audit_log without an asociatie_id restriction. Rows are
 * grouped by asociatie_id and stored in the platform audit store for the viewer.
 * No-op when Supabase is not configured (demo/offline mode).
 */
export async function hydrateAllAuditLogs(): Promise<void> {
  if (!isSupabaseConfigured) return;

  usePlatformAuditStore.getState().setFetchError(null);

  try {
    const { data, error } = await supabase
      .from('audit_log')
      .select('*')
      .order('seq', { ascending: true });

    if (error) {
      usePlatformAuditStore.getState().setFetchError('load');
      reportError(new Error(error.message), { source: 'platformApi.hydrateAllAuditLogs' });
      return;
    }

    const chains: Record<string, AuditEntry[]> = {};
    for (const row of (data as DbAuditRow[])) {
      const entry = rowToAuditEntry(row);
      if (!chains[entry.asociatie_id]) chains[entry.asociatie_id] = [];
      chains[entry.asociatie_id].push(entry);
    }

    usePlatformAuditStore.getState().setChains(chains);
  } catch (err) {
    usePlatformAuditStore.getState().setFetchError('load');
    reportError(err instanceof Error ? err : new Error(String(err)), {
      source: 'platformApi.hydrateAllAuditLogs',
    });
  }
}

interface DbErrorReportRow {
  ref: string;
  name: string;
  message: string;
  source: string | null;
  extra: Record<string, unknown> | null;
  at: number;
  release: string | null;
  stage: string | null;
  stack: string | null;
}

function rowToErrorReport(row: DbErrorReportRow): PlatformErrorReport {
  return {
    ref: row.ref,
    name: row.name,
    message: row.message,
    source: row.source ?? undefined,
    extra: row.extra as PlatformErrorReport['extra'] ?? undefined,
    at: row.at,
    ...(row.release ? { release: row.release } : {}),
    ...(row.stage ? { stage: row.stage } : {}),
    ...(row.stack ? { stack: row.stack } : {}),
  };
}

/**
 * Load per-asociatie usage/health metrics (T97): member count, apartment count,
 * last admin sign-in, and recent activity (30-day window for announcements,
 * tickets, votes). Cross-tenant reads gated by super_admin RLS policies added
 * in the T97 migration. No-op in demo/offline mode.
 */
export async function hydrateUsageMetrics(): Promise<void> {
  if (!isSupabaseConfigured) return;

  usePlatformUsageStore.getState().setFetchError(null);

  try {
    const windowStart = new Date(Date.now() - 30 * 86400000).toISOString();

    const [
      { data: asocRows, error: asocErr },
      { data: memberRows },
      { data: aptRows },
      { data: signInRows },
      { data: annRows },
      { data: ticketRows },
      { data: voteRows },
    ] = await Promise.all([
      supabase
        .from('asociatii')
        .select('id, name')
        .is('deleted_at', null)
        .order('name'),
      supabase
        .from('memberships')
        .select('asociatie_id')
        .is('ended_at', null)
        .neq('role', 'super_admin'),
      supabase
        .from('apartments')
        .select('asociatie_id')
        .eq('is_active', true),
      supabase
        .from('auth_audit_events')
        .select('asociatie_id, created_at')
        .eq('event_type', 'sign_in')
        .order('created_at', { ascending: false })
        .limit(1000),
      supabase
        .from('announcements')
        .select('asociatie_id')
        .gte('created_at', windowStart),
      supabase
        .from('tickets')
        .select('asociatie_id')
        .gte('created_at', windowStart),
      supabase
        .from('votes')
        .select('asociatie_id')
        .gte('created_at', windowStart),
    ]);

    if (asocErr) {
      usePlatformUsageStore.getState().setFetchError('load');
      reportError(new Error(asocErr.message), { source: 'platformApi.hydrateUsageMetrics' });
      return;
    }

    const memberCounts = groupCount((memberRows ?? []) as RowWithAsoc[]);
    const aptCounts = groupCount((aptRows ?? []) as RowWithAsoc[]);
    const lastSignIn = groupLatest((signInRows ?? []) as SignInRow[]);
    const annCounts = groupCount((annRows ?? []) as RowWithAsoc[]);
    const ticketCounts = groupCount((ticketRows ?? []) as RowWithAsoc[]);
    const voteCounts = groupCount((voteRows ?? []) as RowWithAsoc[]);

    const metrics: AssocUsageMetric[] = (asocRows ?? []).map((a) => {
      const lastSignInAt = lastSignIn[a.id as string] ?? null;
      return {
        asociatie_id: a.id as string,
        name: a.name as string,
        city: '',
        members: memberCounts[a.id as string] ?? 0,
        apartments: aptCounts[a.id as string] ?? 0,
        lastAdminSignInAt: lastSignInAt,
        recentAnnouncements: annCounts[a.id as string] ?? 0,
        recentTickets: ticketCounts[a.id as string] ?? 0,
        recentVotes: voteCounts[a.id as string] ?? 0,
        healthStatus: deriveHealthStatus(lastSignInAt),
      };
    });

    usePlatformUsageStore.getState().setMetrics(metrics);
  } catch (err) {
    usePlatformUsageStore.getState().setFetchError('load');
    reportError(err instanceof Error ? err : new Error(String(err)), {
      source: 'platformApi.hydrateUsageMetrics',
    });
  }
}

/**
 * Load the most recent scrubbed error reports (T96) from the platform-level
 * error_reports table using the super_admin RLS policy. Returns the last 500
 * reports ordered newest-first. No-op in demo/offline mode.
 */
export async function hydrateErrorReports(): Promise<void> {
  if (!isSupabaseConfigured) return;

  usePlatformErrorStore.getState().setFetchError(null);

  try {
    const { data, error } = await supabase
      .from('platform_error_reports')
      .select('ref, name, message, source, extra, at, release, stage, stack')
      .order('at', { ascending: false })
      .limit(500);

    if (error) {
      usePlatformErrorStore.getState().setFetchError('load');
      reportError(new Error(error.message), { source: 'platformApi.hydrateErrorReports' });
      return;
    }

    usePlatformErrorStore.getState().setReports(
      (data as DbErrorReportRow[]).map(rowToErrorReport),
    );
  } catch (err) {
    usePlatformErrorStore.getState().setFetchError('load');
    reportError(err instanceof Error ? err : new Error(String(err)), {
      source: 'platformApi.hydrateErrorReports',
    });
  }
}

interface DbSupportThreadRow {
  id: string;
  asociatie_id: string;
  asociatie_name: string;
  admin_user_id: string | null;
  admin_name: string;
  subject: string;
  status: string;
  created_at: string;
}

interface DbSupportMessageRow {
  id: string;
  thread_id: string;
  sender: string;
  sender_name: string;
  body: string;
  created_at: string;
  read: boolean;
}

function rowToSupportThread(row: DbSupportThreadRow, messages: SupportMessage[]): SupportThread {
  return {
    id: row.id,
    asociatie_id: row.asociatie_id,
    asociatie_name: row.asociatie_name,
    admin_user_id: row.admin_user_id ?? '',
    admin_name: row.admin_name,
    subject: row.subject,
    status: (row.status as 'open' | 'resolved') ?? 'open',
    created_at: row.created_at,
    messages,
  };
}

function rowToSupportMessage(row: DbSupportMessageRow): SupportMessage {
  return {
    id: row.id,
    thread_id: row.thread_id,
    sender: row.sender as 'admin' | 'superadmin',
    sender_name: row.sender_name,
    body: row.body,
    created_at: row.created_at,
    read: row.read,
  };
}

/**
 * Load all support threads (T99) cross-tenant for the platform messenger inbox.
 * Uses the superadmin SELECT policy. No-op in demo/offline mode.
 */
export async function hydrateAllSupportThreads(): Promise<void> {
  if (!isSupabaseConfigured) return;

  usePlatformMessengerStore.getState().setFetchError(null);

  try {
    const [{ data: threadRows, error: threadErr }, { data: msgRows, error: msgErr }] =
      await Promise.all([
        supabase
          .from('support_threads')
          .select('id, asociatie_id, asociatie_name, admin_user_id, admin_name, subject, status, created_at')
          .order('created_at', { ascending: false }),
        supabase
          .from('support_messages')
          .select('id, thread_id, sender, sender_name, body, created_at, read')
          .order('created_at', { ascending: true }),
      ]);

    if (threadErr || msgErr) {
      usePlatformMessengerStore.getState().setFetchError('load');
      const err = threadErr ?? msgErr;
      if (err) reportError(new Error(err.message), { source: 'platformApi.hydrateAllSupportThreads' });
      return;
    }

    const msgsByThread: Record<string, SupportMessage[]> = {};
    for (const row of (msgRows as DbSupportMessageRow[]) ?? []) {
      (msgsByThread[row.thread_id] ??= []).push(rowToSupportMessage(row));
    }

    const byAsociatie: Record<string, SupportThread[]> = {};
    for (const row of (threadRows as DbSupportThreadRow[]) ?? []) {
      const thread = rowToSupportThread(row, msgsByThread[row.id] ?? []);
      (byAsociatie[row.asociatie_id] ??= []).push(thread);
    }

    for (const [asociatieId, threads] of Object.entries(byAsociatie)) {
      usePlatformMessengerStore.getState().replaceAll(asociatieId, threads);
    }
  } catch (err) {
    usePlatformMessengerStore.getState().setFetchError('load');
    reportError(err instanceof Error ? err : new Error(String(err)), {
      source: 'platformApi.hydrateAllSupportThreads',
    });
  }
}

interface DbPlatformAdminRow {
  user_id: string;
  name: string;
  email: string;
  granted_at: string;
}

interface DbSignInRow {
  user_id: string;
  created_at: string;
}

/**
 * Load the platform operator roster (T251) from `platform_admins` using the
 * service-role client's super_admin SELECT policy. Merges in the most recent
 * sign-in timestamp from `auth_audit_events` per operator. No-op in
 * demo/offline mode.
 */
export async function hydrateTeam(): Promise<void> {
  if (!isSupabaseConfigured) return;

  usePlatformTeamStore.getState().setFetchError(null);

  try {
    const { data: adminRows, error: adminErr } = await supabase
      .from('platform_admins')
      .select('user_id, name, email, granted_at')
      .order('granted_at', { ascending: true });

    if (adminErr) {
      usePlatformTeamStore.getState().setFetchError('load');
      reportError(new Error(adminErr.message), { source: 'platformApi.hydrateTeam' });
      return;
    }

    const userIds = ((adminRows ?? []) as DbPlatformAdminRow[]).map((r) => r.user_id);
    let lastSignIn: Record<string, string> = {};

    if (userIds.length > 0) {
      const { data: signInRows } = await supabase
        .from('auth_audit_events')
        .select('user_id, created_at')
        .eq('event_type', 'sign_in')
        .in('user_id', userIds)
        .order('created_at', { ascending: false })
        .limit(500);

      lastSignIn = ((signInRows ?? []) as DbSignInRow[]).reduce<Record<string, string>>(
        (acc, r) => {
          if (!acc[r.user_id]) acc[r.user_id] = r.created_at;
          return acc;
        },
        {},
      );
    }

    const admins: PlatformTeamAdmin[] = ((adminRows ?? []) as DbPlatformAdminRow[]).map((r) => ({
      userId: r.user_id,
      name: r.name,
      email: r.email,
      grantedAt: r.granted_at,
      lastSignInAt: lastSignIn[r.user_id] ?? null,
    }));

    usePlatformTeamStore.getState().replaceAdmins(admins);
  } catch (err) {
    usePlatformTeamStore.getState().setFetchError('load');
    reportError(err instanceof Error ? err : new Error(String(err)), {
      source: 'platformApi.hydrateTeam',
    });
  }
}

interface DbBroadcastRow {
  id: string;
  title: string;
  body: string;
  severity: string;
  target: string;
  starts_at: string;
  ends_at: string | null;
  created_by: string | null;
  created_at: string;
  expired_at: string | null;
}

/**
 * Load all platform broadcasts for the superadmin console (T253).
 * No-op in demo/offline mode.
 */
export async function hydratePlatformBroadcasts(): Promise<void> {
  if (!isSupabaseConfigured) return;

  usePlatformBroadcastStore.getState().setFetchError(null);

  try {
    const { data, error } = await supabase
      .from('platform_broadcasts')
      .select('id, title, body, severity, target, starts_at, ends_at, created_by, created_at, expired_at')
      .order('created_at', { ascending: false });

    if (error) {
      usePlatformBroadcastStore.getState().setFetchError('load');
      reportError(new Error(error.message), { source: 'platformApi.hydratePlatformBroadcasts' });
      return;
    }

    const rows: PlatformBroadcast[] = ((data ?? []) as DbBroadcastRow[]).map((r) => ({
      id: r.id,
      title: r.title,
      body: r.body,
      severity: r.severity as PlatformBroadcast['severity'],
      target: r.target as PlatformBroadcast['target'],
      startsAt: r.starts_at,
      endsAt: r.ends_at ?? null,
      createdBy: r.created_by ?? '',
      createdAt: r.created_at,
      expiredAt: r.expired_at ?? null,
    }));

    usePlatformBroadcastStore.getState().replace(rows);
  } catch (err) {
    usePlatformBroadcastStore.getState().setFetchError('load');
    reportError(err instanceof Error ? err : new Error(String(err)), {
      source: 'platformApi.hydratePlatformBroadcasts',
    });
  }
}
