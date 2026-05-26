import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import {
  type FeatureRequest,
  addRequest,
  hasRequested,
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
    }),
    { name: 'vecini.featureRequests' },
  ),
);
