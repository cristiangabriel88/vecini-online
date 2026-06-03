import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LendingItem } from '@/shared/types/domain';
import { useAuthStore } from '@/shared/store/authStore';
import {
  type LendingByAsociatie,
  seedLending,
  lendingForAsociatie,
  addLendingIn,
  toggleAvailableIn,
  migrateLendingState,
} from './lendingLogic';

interface LendingState {
  byAsociatie: LendingByAsociatie;
  fetchError: string | null;
  addItem: (asociatieId: string, item: LendingItem) => void;
  toggleAvailable: (asociatieId: string, id: string) => void;
  replaceForAsociatie: (asociatieId: string, items: LendingItem[]) => void;
  setFetchError: (msg: string | null) => void;
}

export const useLendingStore = create<LendingState>()(
  persist(
    (set) => ({
      byAsociatie: seedLending(),
      fetchError: null,

      addItem: (asociatieId, item) =>
        set((s) => ({ byAsociatie: addLendingIn(s.byAsociatie, asociatieId, item) })),

      toggleAvailable: (asociatieId, id) =>
        set((s) => ({ byAsociatie: toggleAvailableIn(s.byAsociatie, asociatieId, id) })),

      replaceForAsociatie: (asociatieId, items) =>
        set((s) => ({ byAsociatie: { ...s.byAsociatie, [asociatieId]: items } })),

      setFetchError: (msg) => set({ fetchError: msg }),
    }),
    {
      name: 'vecini.lending',
      version: 1,
      partialize: (s) => ({ byAsociatie: s.byAsociatie }),
      migrate: (persisted) => ({ byAsociatie: migrateLendingState(persisted) }),
    },
  ),
);

export function useAsociatieLending(): LendingItem[] {
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  return useLendingStore((s) => lendingForAsociatie(s.byAsociatie, asociatieId));
}
