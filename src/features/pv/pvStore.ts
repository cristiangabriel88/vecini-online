import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PvDocument } from '@/shared/types/domain';
import { useAuthStore } from '@/shared/store/authStore';
import {
  type PvsByAsociatie,
  migratePvsState,
  pvForAsociatie,
  seedPvs,
} from './pvLogic';

interface PvState {
  /** PV documents per asociație, keyed by asociație id. */
  byAsociatie: PvsByAsociatie;
  /** Non-null when the last live fetch failed; null in demo/offline or after a successful fetch. */
  fetchError: string | null;
  /** Replace the full list for one asociație (used by live hydration and add). */
  replaceForAsociatie: (asociatieId: string, items: PvDocument[]) => void;
  /** Set or clear the live-fetch error (called by the API layer). */
  setFetchError: (msg: string | null) => void;
  /** The documents for one asociație (stable reference). */
  forAsociatie: (asociatieId: string | null) => PvDocument[];
}

/**
 * PV documents (F11) scoped per asociație: the demo asociație is seeded so the
 * offline app is populated. Persisted so added documents survive reload; version
 * bumps reseed the demo asociație so stale demo content is refreshed.
 * Live read/write against `pv_documents` under RLS is in `pvApi.ts`.
 */
export const usePvStore = create<PvState>()(
  persist(
    (set, get) => ({
      byAsociatie: seedPvs(),
      fetchError: null,
      replaceForAsociatie: (asociatieId, items) =>
        set((s) => ({ byAsociatie: { ...s.byAsociatie, [asociatieId]: items } })),
      setFetchError: (msg) => set({ fetchError: msg }),
      forAsociatie: (asociatieId) => pvForAsociatie(get().byAsociatie, asociatieId),
    }),
    {
      name: 'vecini.pv',
      version: 1,
      partialize: (s) => ({ byAsociatie: s.byAsociatie }),
      migrate: (persisted) => ({ byAsociatie: migratePvsState(persisted) }),
    },
  ),
);

/** Hook: the PV documents for the currently active asociație. */
export function useAsociatiePvDocs(): PvDocument[] {
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  return usePvStore((s) => pvForAsociatie(s.byAsociatie, asociatieId));
}
