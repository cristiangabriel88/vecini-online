import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MultiyearPlanItem } from '@/shared/types/domain';
import { useAuthStore } from '@/shared/store/authStore';
import {
  type MultiyearByAsociatie,
  seedMultiyear,
  multiyearForAsociatie,
  addMultiyearIn,
  migrateMultiyearState,
} from './multiyearLogic';

interface MultiyearState {
  byAsociatie: MultiyearByAsociatie;
  fetchError: string | null;
  addItem: (asociatieId: string, item: MultiyearPlanItem) => void;
  replaceForAsociatie: (asociatieId: string, items: MultiyearPlanItem[]) => void;
  setFetchError: (msg: string | null) => void;
}

export const useMultiyearStore = create<MultiyearState>()(
  persist(
    (set) => ({
      byAsociatie: seedMultiyear(),
      fetchError: null,

      addItem: (asociatieId, item) =>
        set((s) => ({ byAsociatie: addMultiyearIn(s.byAsociatie, asociatieId, item) })),

      replaceForAsociatie: (asociatieId, items) =>
        set((s) => ({ byAsociatie: { ...s.byAsociatie, [asociatieId]: items } })),

      setFetchError: (msg) => set({ fetchError: msg }),
    }),
    {
      name: 'vecini.multiyear',
      version: 1,
      partialize: (s) => ({ byAsociatie: s.byAsociatie }),
      migrate: (persisted) => ({ byAsociatie: migrateMultiyearState(persisted) }),
    },
  ),
);

export function useAsociatieMultiyear(): MultiyearPlanItem[] {
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  return useMultiyearStore((s) => multiyearForAsociatie(s.byAsociatie, asociatieId));
}
