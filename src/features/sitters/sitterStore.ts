import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SitterProfile } from '@/shared/types/domain';
import { useAuthStore } from '@/shared/store/authStore';
import {
  type SittersByAsociatie,
  seedSitters,
  sittersForAsociatie,
  upsertSitterIn,
  removeSitterIn,
  migrateSittersState,
} from './sitterLogic';

interface SitterState {
  byAsociatie: SittersByAsociatie;
  fetchError: string | null;
  upsertProfile: (asociatieId: string, profile: SitterProfile) => void;
  removeProfile: (asociatieId: string, userId: string) => void;
  replaceForAsociatie: (asociatieId: string, items: SitterProfile[]) => void;
  setFetchError: (msg: string | null) => void;
}

export const useSitterStore = create<SitterState>()(
  persist(
    (set) => ({
      byAsociatie: seedSitters(),
      fetchError: null,

      upsertProfile: (asociatieId, profile) =>
        set((s) => ({ byAsociatie: upsertSitterIn(s.byAsociatie, asociatieId, profile) })),

      removeProfile: (asociatieId, userId) =>
        set((s) => ({ byAsociatie: removeSitterIn(s.byAsociatie, asociatieId, userId) })),

      replaceForAsociatie: (asociatieId, items) =>
        set((s) => ({ byAsociatie: { ...s.byAsociatie, [asociatieId]: items } })),

      setFetchError: (msg) => set({ fetchError: msg }),
    }),
    {
      name: 'vecini.sitters',
      version: 1,
      partialize: (s) => ({ byAsociatie: s.byAsociatie }),
      migrate: (persisted) => ({ byAsociatie: migrateSittersState(persisted) }),
    },
  ),
);

export function useAsociatieSitters(): SitterProfile[] {
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  return useSitterStore((s) => sittersForAsociatie(s.byAsociatie, asociatieId));
}
