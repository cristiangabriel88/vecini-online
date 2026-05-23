import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import {
  type BreachRecord,
  type NewBreachInput,
  advanceBreach,
  markAuthorityNotified,
  markSubjectsNotified,
  newBreach,
} from '@/features/gdpr/breachLogic';

/**
 * Personal-data breach log (T22, GDPR art. 33/34): the append-only record of
 * breaches the association (controller) has handled, with the risk
 * classification, the 72-hour authority-notification trail and, on a high risk,
 * the resident-notification trail.
 *
 * Persisted so demo mode keeps a working log offline; when a backend is present
 * each new record and each status/notification change is mirrored, best-effort,
 * to `data_breaches`. The table has no delete policy, so the log stays
 * tamper-evident — the accountability trail the controller must be able to
 * produce on request (art. 33(5)).
 */
interface BreachState {
  breaches: BreachRecord[];

  record: (
    asociatieId: string,
    reportedBy: string | null,
    input: NewBreachInput,
  ) => BreachRecord;
  advance: (id: string) => void;
  notifyAuthority: (id: string) => void;
  notifySubjects: (id: string) => void;
}

function mirrorInsert(r: BreachRecord): void {
  if (!isSupabaseConfigured) return;
  void (async () => {
    try {
      await supabase.from('data_breaches').insert({
        asociatie_id: r.asociatie_id,
        title: r.title,
        description: r.description,
        nature: r.nature,
        discovered_at: r.discovered_at,
        occurred_at: r.occurred_at,
        data_categories: r.data_categories,
        affected_count: r.affected_count,
        risk: r.risk,
        factors: r.factors,
        consequences: r.consequences,
        measures: r.measures,
        status: r.status,
        reported_by: r.reported_by,
      });
    } catch {
      /* mirroring is best-effort; the local log is authoritative for the UI */
    }
  })();
}

function mirrorUpdate(r: BreachRecord): void {
  if (!isSupabaseConfigured) return;
  void (async () => {
    try {
      await supabase
        .from('data_breaches')
        .update({
          status: r.status,
          authority_notified_at: r.authority_notified_at,
          subjects_notified_at: r.subjects_notified_at,
        })
        .eq('id', r.id);
    } catch {
      /* mirroring is best-effort */
    }
  })();
}

/** Apply a pure transform to one record, mirror the change, no-op if missing. */
function transform(
  get: () => BreachState,
  set: (partial: Partial<BreachState>) => void,
  id: string,
  fn: (r: BreachRecord) => BreachRecord,
): void {
  let changed: BreachRecord | null = null;
  set({
    breaches: get().breaches.map((r) => {
      if (r.id !== id) return r;
      changed = fn(r);
      return changed;
    }),
  });
  if (changed) mirrorUpdate(changed);
}

export const useBreachStore = create<BreachState>()(
  persist(
    (set, get) => ({
      breaches: [],

      record: (asociatieId, reportedBy, input) => {
        const r = newBreach(asociatieId, reportedBy, input);
        set({ breaches: [r, ...get().breaches] });
        mirrorInsert(r);
        return r;
      },

      advance: (id) => transform(get, set, id, (r) => advanceBreach(r)),
      notifyAuthority: (id) => transform(get, set, id, (r) => markAuthorityNotified(r)),
      notifySubjects: (id) => transform(get, set, id, (r) => markSubjectsNotified(r)),
    }),
    { name: 'intrevecini.breaches' },
  ),
);
