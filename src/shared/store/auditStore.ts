import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { reportError } from '@/shared/lib/errorReporting';
import {
  type AuditEntry,
  type AuditInput,
  appendEntry,
  buildDemoAuditChain,
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

/** Mirror a new entry into the backend; best-effort, never throws to the caller. */
function mirrorLive(entry: AuditEntry): void {
  if (!isSupabaseConfigured) return;
  void (async () => {
    try {
      await supabase.from('audit_log').insert({
        asociatie_id: entry.asociatie_id,
        actor_user_id: entry.actor_user_id,
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
  /** Tamper-evident audit chains, keyed by asociație id. */
  byAsociatie: AuditByAsociatie;
  /** Append a change to one asociație's chain (and mirror it live). */
  record: (input: AuditInput) => void;
  /** The chain for one asociație (stable reference). */
  forAsociatie: (asociatieId: string | null) => AuditEntry[];
}

/**
 * Audit-log store (T09): an append-only, tamper-evident trail of state changes
 * across the app's admin and content surfaces, scoped per asociație. The demo
 * asociație is seeded so the offline log is populated; each recorded change
 * extends the active asociație's hash chain. The local store is the offline
 * source of truth; with a backend present each entry is mirrored to `audit_log`
 * (live ordering authority is a follow-up). Persisted, unlike the content
 * stores: an audit trail must survive a reload to stay tamper-evident, so the
 * seeded chain plus any recorded entries are kept in local storage offline.
 */
export const useAuditStore = create<AuditState>()(
  persist(
    (set, get) => ({
      byAsociatie: seedAudit(),
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
      forAsociatie: (asociatieId) => chainFor(get().byAsociatie, asociatieId),
    }),
    { name: 'vecini.audit', version: 1 },
  ),
);

/** Hook: the audit chain for the currently active asociație. */
export function useAsociatieAudit(): AuditEntry[] {
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  return useAuditStore((s) => chainFor(s.byAsociatie, asociatieId));
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
