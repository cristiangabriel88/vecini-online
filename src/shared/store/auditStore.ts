import { useEffect } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { reportError } from '@/shared/lib/errorReporting';
import {
  type AuditEntry,
  type AuditAction,
  type AuditEntity,
  type AuditInput,
  appendEntry,
  buildDemoAuditChain,
  GENESIS_HASH,
} from '@/features/audit/auditLogic';
import {
  DEMO_ASOCIATIE,
  DEMO_CURRENT_USER_ID,
  DEMO_CURRENT_USER_NAME,
} from '@/shared/demo/demoData';
import { useAuthStore } from './authStore';

export type AuditByAsociatie = Record<string, AuditEntry[]>;

/** Shared frozen empty chain so selectors keep a stable reference (no churn). */
const EMPTY_CHAIN = Object.freeze([] as AuditEntry[]) as AuditEntry[];

/** Seed the demo asociație with a small valid chain so the log is populated. */
function seedAudit(): AuditByAsociatie {
  return {
    [DEMO_ASOCIATIE.id]: buildDemoAuditChain(
      DEMO_ASOCIATIE.id,
      DEMO_CURRENT_USER_ID,
      DEMO_CURRENT_USER_NAME,
    ),
  };
}

/** The chain for one asociație, or the shared frozen empty chain. */
function chainFor(byAsociatie: AuditByAsociatie, asociatieId: string | null): AuditEntry[] {
  if (!asociatieId) return EMPTY_CHAIN;
  return byAsociatie[asociatieId] ?? EMPTY_CHAIN;
}

/** Shape of one row returned by the audit_log Supabase query. */
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

/** Convert a DB row to the client AuditEntry shape. */
function rowToEntry(row: DbAuditRow): AuditEntry {
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

/** Mirror a new entry into the backend; best-effort, never throws to the caller. */
function mirrorLive(entry: AuditEntry): void {
  if (!isSupabaseConfigured) return;
  void (async () => {
    try {
      await supabase.from('audit_log').insert({
        asociatie_id: entry.asociatie_id,
        actor_user_id: entry.actor_user_id,
        actor_name: entry.actor_name,
        action: entry.action,
        entity: entry.entity,
        entity_label: entry.entity_label,
        before_value: entry.before,
        after_value: entry.after,
        seq: entry.seq,
        prev_hash: entry.prev_hash,
        hash: entry.hash,
      });
    } catch (err) {
      reportError(err, { source: 'auditStore.mirrorLive' });
    }
  })();
}

interface AuditState {
  /** Persisted tamper-evident audit chains, keyed by asociație id. */
  byAsociatie: AuditByAsociatie;
  /**
   * Live chains fetched from Supabase, keyed by asociație id. Not persisted —
   * re-fetched on each mount so the page always reflects the server state.
   */
  liveByAsociatie: AuditByAsociatie;
  /**
   * Server-returned HMAC-SHA256 of the chain tail, keyed by asociatieId.
   * undefined = not yet fetched; null = fetched but AUDIT_HMAC_SECRET not configured.
   * Not persisted -- re-requested each session so it reflects the live tail.
   */
  chainHmacByAsociatie: Record<string, string | null>;
  /** Append a change to one asociație's chain (and mirror it live). */
  record: (input: AuditInput) => void;
  /**
   * Fetch the live audit_log from Supabase for one asociație and cache the
   * result in `liveByAsociatie`. No-op when Supabase is not configured or the
   * asociatieId is empty. Falls back silently on error (offline chain shown).
   */
  hydrateForAsociatie: (asociatieId: string) => Promise<void>;
  /**
   * Request the HMAC-SHA256 signature for the current chain tail from the
   * `audit-hmac` Netlify function. Stores the result in `chainHmacByAsociatie`.
   * No-op when offline, no session, or the chain is empty.
   */
  fetchChainHmac: (asociatieId: string) => Promise<void>;
  /** The chain for one asociație: live when available, persisted otherwise. */
  forAsociatie: (asociatieId: string | null) => AuditEntry[];
}

/**
 * Audit-log store (T09): an append-only, tamper-evident trail of state changes
 * across the app's admin and content surfaces, scoped per asociație. The demo
 * asociație is seeded so the offline log is populated; each recorded change
 * extends the active asociație's hash chain.
 *
 * T86: when Supabase is configured, `hydrateForAsociatie` reads the live
 * `audit_log` table (admin-read under RLS) and stores it in `liveByAsociatie`.
 * `forAsociatie` returns the live chain when present, the persisted offline
 * chain otherwise — so the audit page always shows the server-authoritative
 * ordering. The seq of each entry is stamped by the DB trigger
 * `audit_log_chain_stamp`, preventing concurrent duplicates. The hash is
 * client-computed (non-cryptographic; the RLS append-only policy is the real
 * tamper-evidence control) and is NOT verified for live data.
 */
export const useAuditStore = create<AuditState>()(
  persist(
    (set, get) => ({
      byAsociatie: seedAudit(),
      liveByAsociatie: {},
      chainHmacByAsociatie: {},
      record: (input) => {
        let appended: AuditEntry | null = null;
        set((s) => {
          const chain = s.byAsociatie[input.asociatie_id] ?? [];
          const next = appendEntry(chain, input);
          appended = next[next.length - 1];
          return { byAsociatie: { ...s.byAsociatie, [input.asociatie_id]: next } };
        });
        if (appended) mirrorLive(appended);
      },
      hydrateForAsociatie: async (asociatieId) => {
        if (!isSupabaseConfigured || !asociatieId) return;
        try {
          const { data, error } = await supabase
            .from('audit_log')
            .select('*')
            .eq('asociatie_id', asociatieId)
            .order('seq', { ascending: true });
          if (error) throw error;
          const entries = (data as DbAuditRow[]).map(rowToEntry);
          set((s) => ({
            liveByAsociatie: { ...s.liveByAsociatie, [asociatieId]: entries },
          }));
        } catch (err) {
          reportError(err, { source: 'auditStore.hydrateForAsociatie' });
          // leave liveByAsociatie unchanged; forAsociatie falls back to local chain
        }
      },
      fetchChainHmac: async (asociatieId) => {
        if (!isSupabaseConfigured || !asociatieId) return;
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const token = sessionData.session?.access_token;
          if (!token) return;
          const chain = get().forAsociatie(asociatieId);
          if (!chain.length) return;
          const tailHash = chain[chain.length - 1].hash;
          const resp = await fetch('/.netlify/functions/audit-hmac', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ asociatie_id: asociatieId, tail_hash: tailHash }),
          });
          if (!resp.ok) return;
          const body = (await resp.json()) as { hmac: string | null };
          set((s) => ({
            chainHmacByAsociatie: { ...s.chainHmacByAsociatie, [asociatieId]: body.hmac },
          }));
        } catch (err) {
          reportError(err, { source: 'auditStore.fetchChainHmac' });
        }
      },
      forAsociatie: (asociatieId) => {
        const s = get();
        if (asociatieId && s.liveByAsociatie[asociatieId]) {
          return s.liveByAsociatie[asociatieId];
        }
        return chainFor(s.byAsociatie, asociatieId);
      },
    }),
    {
      name: 'vecini.audit',
      version: 1,
      // Only persist the offline chain; live data is re-fetched on each mount.
      partialize: (s) => ({ byAsociatie: s.byAsociatie }),
    },
  ),
);

/**
 * Hook: the audit chain for the currently active asociație. When Supabase is
 * configured, triggers a hydration on mount and asociație change so the page
 * shows the server-authoritative ordering. Falls back to the local persisted
 * chain when offline or on hydration error.
 */
export function useAsociatieAudit(): AuditEntry[] {
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);

  useEffect(() => {
    if (asociatieId && isSupabaseConfigured) {
      void useAuditStore.getState().hydrateForAsociatie(asociatieId);
    }
  }, [asociatieId]);

  return useAuditStore((s) => s.forAsociatie(asociatieId));
}

/**
 * Record an audit entry from an event handler (non-hook). Resolves the active
 * asociație and actor from the auth store, falling back to the demo identity
 * offline, so callers only pass what changed. A no-op when no asociație is
 * active (nothing to scope the entry to).
 */
export function recordAudit(
  fields: Omit<AuditInput, 'asociatie_id' | 'actor_user_id' | 'actor_name'>,
): void {
  const auth = useAuthStore.getState();
  const asociatieId = auth.currentAsociatieId;
  if (!asociatieId) return;
  useAuditStore.getState().record({
    asociatie_id: asociatieId,
    actor_user_id: auth.profile?.id ?? DEMO_CURRENT_USER_ID,
    actor_name: auth.profile?.full_name ?? DEMO_CURRENT_USER_NAME,
    ...fields,
  });
}
