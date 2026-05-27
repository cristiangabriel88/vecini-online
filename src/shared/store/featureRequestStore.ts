import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import {
  type FeatureRequest,
  type FeatureRequestSummary,
  addRequest,
  clearRequestsFor,
  hasRequested,
  replaceAsociatieRequests,
  summarizeRequests,
} from '@/shared/features/featureRequestLogic';

/**
 * Resident-driven feature activation requests (T150): when a resident lands on a
 * module their asociație has not enabled, they can ask the admin to turn it on.
 *
 * Persisted so demo mode keeps the "already requested" state across a refresh and
 * stays fully offline; when a backend is present each new request is mirrored,
 * best-effort, to `feature_requests` (one row per resident + module, deduped both
 * here and by a DB unique constraint). The local list is authoritative for the UI.
 */
interface FeatureRequestState {
  requests: FeatureRequest[];

  /**
   * File an activation request, idempotently. Returns `true` when a new request
   * was recorded, `false` when this resident had already asked (so the caller can
   * tailor the toast). The backend mirror only fires for a genuinely new row.
   */
  request: (
    asociatieId: string,
    featureKey: string,
    requestedById: string,
    requestedByName: string | null,
  ) => boolean;

  /** Has this resident already asked for this module in this asociație? */
  has: (asociatieId: string, featureKey: string, requestedById: string) => boolean;

  /**
   * The admin triage queue for one asociație: one entry per requested module
   * with its requester count + names, newest-first (see `summarizeRequests`).
   */
  summaryFor: (asociatieId: string) => FeatureRequestSummary[];

  /**
   * Clear every request for one module in one asociație once the admin has
   * actioned it (e.g. enabled the module). Mirrors the delete to the backend.
   */
  clearFor: (asociatieId: string, featureKey: string) => void;

  /**
   * Load this asociație's requests from `feature_requests` when a backend is
   * present (the admin read policy resolves the full tenant slice), replacing
   * the local slice for that asociație. A no-op offline, where the persisted
   * store is already authoritative for the demo queue.
   */
  hydrateFor: (asociatieId: string) => Promise<void>;
}

function mirrorInsert(r: FeatureRequest): void {
  if (!isSupabaseConfigured) return;
  void (async () => {
    try {
      await supabase.from('feature_requests').insert({
        asociatie_id: r.asociatieId,
        feature_key: r.featureKey,
        requested_by: r.requestedById,
        requester_name: r.requestedByName,
      });
    } catch {
      /* mirroring is best-effort; the local list is authoritative for the UI */
    }
  })();
}

function mirrorClear(asociatieId: string, featureKey: string): void {
  if (!isSupabaseConfigured) return;
  void (async () => {
    try {
      // The "admin clear asociatie feature requests" delete policy authorises
      // an admin / president to remove the actioned demand for their asociație.
      await supabase
        .from('feature_requests')
        .delete()
        .match({ asociatie_id: asociatieId, feature_key: featureKey });
    } catch {
      /* best-effort; the local list is authoritative for the UI */
    }
  })();
}

export const useFeatureRequestStore = create<FeatureRequestState>()(
  persist(
    (set, get) => ({
      requests: [],

      request: (asociatieId, featureKey, requestedById, requestedByName) => {
        const { requests, added } = addRequest(
          get().requests,
          asociatieId,
          featureKey,
          requestedById,
          requestedByName,
        );
        if (!added) return false;
        set({ requests });
        mirrorInsert(added);
        return true;
      },

      has: (asociatieId, featureKey, requestedById) =>
        hasRequested(get().requests, asociatieId, featureKey, requestedById),

      summaryFor: (asociatieId) => summarizeRequests(get().requests, asociatieId),

      clearFor: (asociatieId, featureKey) => {
        set({ requests: clearRequestsFor(get().requests, asociatieId, featureKey) });
        mirrorClear(asociatieId, featureKey);
      },

      hydrateFor: async (asociatieId) => {
        if (!isSupabaseConfigured) return;
        try {
          const { data, error } = await supabase
            .from('feature_requests')
            .select('id, asociatie_id, feature_key, requested_by, requester_name, created_at')
            .eq('asociatie_id', asociatieId);
          if (error || !data) return;
          const hydrated: FeatureRequest[] = data.map((row) => ({
            id: String(row.id),
            asociatieId: String(row.asociatie_id),
            featureKey: String(row.feature_key),
            requestedById: String(row.requested_by),
            requestedByName: row.requester_name ?? null,
            createdAt: new Date(row.created_at as string).getTime(),
          }));
          set((s) => ({
            requests: replaceAsociatieRequests(s.requests, asociatieId, hydrated),
          }));
        } catch {
          /* best-effort; the persisted store stays as the offline fallback */
        }
      },
    }),
    { name: 'vecini.featureRequests' },
  ),
);
