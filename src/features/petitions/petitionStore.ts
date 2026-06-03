import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Petition } from '@/shared/types/domain';
import { useAuthStore } from '@/shared/store/authStore';
import {
  type PetitionCatalog,
  type PetitionsByAsociatie,
  addPetitionResponse,
  isThresholdReached,
  migratePetitionsState,
  petitionsForAsociatie,
  seedPetitions,
} from './petitionLogic';

interface PetitionState {
  /** Petition catalog per asociație, keyed by asociație id. */
  byAsociatie: PetitionsByAsociatie;
  /** This-device signed map: petitionId -> true when the user has signed. */
  mySigned: Record<string, boolean>;
  /** Non-null when the last live fetch failed; null in demo/offline or after success. */
  fetchError: string | null;
  /** Prepend a new petition to one asociație's catalog (auto-marks as signed). */
  addPetition: (asociatieId: string, petition: Petition) => void;
  /** Sign a petition once; flips status to 'inaintata' when threshold is met. */
  signPetition: (asociatieId: string, petitionId: string) => void;
  /** Replace one asociație's full petition list (used by live hydration). */
  replaceForAsociatie: (asociatieId: string, items: Petition[]) => void;
  /** Apply an official committee response to one petition. */
  addResponse: (
    asociatieId: string,
    petitionId: string,
    response: string,
    respondedAt: string,
    respondedByName: string,
  ) => void;
  /** Set or clear the live-fetch error (called by the API layer). */
  setFetchError: (msg: string | null) => void;
  /** The petition catalog for one asociație (stable reference). */
  forAsociatie: (asociatieId: string | null) => PetitionCatalog;
}

/**
 * Petitions (F16) scoped per asociație (T196): the demo asociație is seeded so
 * the offline app is populated. Persisted so a submitted petition and signature
 * survive reload; version bumps reseed the demo asociație from DEMO_PETITIONS.
 * Live read/write against `petitions`/`petition_signatures` under RLS is in
 * `petitionApi.ts`; this module stays the synchronous source of truth.
 */
export const usePetitionStore = create<PetitionState>()(
  persist(
    (set, get) => ({
      byAsociatie: seedPetitions(),
      mySigned: {},
      fetchError: null,

      addPetition: (asociatieId, petition) =>
        set((s) => {
          const catalog = petitionsForAsociatie(s.byAsociatie, asociatieId);
          return {
            byAsociatie: {
              ...s.byAsociatie,
              [asociatieId]: { items: [petition, ...catalog.items] },
            },
            mySigned: { ...s.mySigned, [petition.id]: true },
          };
        }),

      signPetition: (asociatieId, petitionId) =>
        set((s) => {
          if (s.mySigned[petitionId]) return s;
          const catalog = petitionsForAsociatie(s.byAsociatie, asociatieId);
          const updatedItems = catalog.items.map((p) => {
            if (p.id !== petitionId) return p;
            const updated = { ...p, signatures: p.signatures + 1 };
            return {
              ...updated,
              status: isThresholdReached(updated) ? 'inaintata' : updated.status,
            };
          });
          return {
            mySigned: { ...s.mySigned, [petitionId]: true },
            byAsociatie: {
              ...s.byAsociatie,
              [asociatieId]: { items: updatedItems },
            },
          };
        }),

      replaceForAsociatie: (asociatieId, items) =>
        set((s) => ({ byAsociatie: { ...s.byAsociatie, [asociatieId]: { items } } })),

      addResponse: (asociatieId, petitionId, response, respondedAt, respondedByName) =>
        set((s) => {
          const catalog = petitionsForAsociatie(s.byAsociatie, asociatieId);
          return {
            byAsociatie: {
              ...s.byAsociatie,
              [asociatieId]: addPetitionResponse(catalog, petitionId, response, respondedAt, respondedByName),
            },
          };
        }),

      setFetchError: (msg) => set({ fetchError: msg }),

      forAsociatie: (asociatieId) => petitionsForAsociatie(get().byAsociatie, asociatieId),
    }),
    {
      name: 'vecini.petitions',
      version: 1,
      partialize: (s) => ({ byAsociatie: s.byAsociatie, mySigned: s.mySigned }),
      migrate: (persisted) => ({ byAsociatie: migratePetitionsState(persisted) }),
    },
  ),
);

/** Hook: the petition catalog for the currently active asociație. */
export function useAsociatiePetitions(): PetitionCatalog {
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  return usePetitionStore((s) => petitionsForAsociatie(s.byAsociatie, asociatieId));
}
