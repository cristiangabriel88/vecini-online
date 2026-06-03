import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CarpoolProfile } from '@/shared/types/domain';
import { useAuthStore } from '@/shared/store/authStore';
import {
  type CarpoolsByAsociatie,
  seedCarpool,
  carpoolForAsociatie,
  upsertCarpoolIn,
  removeCarpoolIn,
  migrateCarpoolState,
} from './carpoolLogic';

interface CarpoolState {
  byAsociatie: CarpoolsByAsociatie;
  fetchError: string | null;
  upsertProfile: (asociatieId: string, profile: CarpoolProfile) => void;
  removeProfile: (asociatieId: string, userId: string) => void;
  replaceForAsociatie: (asociatieId: string, items: CarpoolProfile[]) => void;
  setFetchError: (msg: string | null) => void;
}

export const useCarpoolStore = create<CarpoolState>()(
  persist(
    (set) => ({
      byAsociatie: seedCarpool(),
      fetchError: null,

      upsertProfile: (asociatieId, profile) =>
        set((s) => ({ byAsociatie: upsertCarpoolIn(s.byAsociatie, asociatieId, profile) })),

      removeProfile: (asociatieId, userId) =>
        set((s) => ({ byAsociatie: removeCarpoolIn(s.byAsociatie, asociatieId, userId) })),

      replaceForAsociatie: (asociatieId, items) =>
        set((s) => ({ byAsociatie: { ...s.byAsociatie, [asociatieId]: items } })),

      setFetchError: (msg) => set({ fetchError: msg }),
    }),
    {
      name: 'vecini.carpool',
      version: 1,
      partialize: (s) => ({ byAsociatie: s.byAsociatie }),
      migrate: (persisted) => ({ byAsociatie: migrateCarpoolState(persisted) }),
    },
  ),
);

export function useAsociatieCarpool(): CarpoolProfile[] {
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  return useCarpoolStore((s) => carpoolForAsociatie(s.byAsociatie, asociatieId));
}
