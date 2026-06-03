import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { StorageUnit } from '@/shared/types/domain';
import { useAuthStore } from '@/shared/store/authStore';
import {
  type StorageByAsociatie,
  seedStorageUnits,
  storageForAsociatie,
  addStorageIn,
  migrateStorageState,
} from './storageLogic';

interface StorageState {
  byAsociatie: StorageByAsociatie;
  fetchError: string | null;
  addUnit: (asociatieId: string, unit: StorageUnit) => void;
  replaceForAsociatie: (asociatieId: string, units: StorageUnit[]) => void;
  setFetchError: (msg: string | null) => void;
}

export const useStorageStore = create<StorageState>()(
  persist(
    (set) => ({
      byAsociatie: seedStorageUnits(),
      fetchError: null,

      addUnit: (asociatieId, unit) =>
        set((s) => ({ byAsociatie: addStorageIn(s.byAsociatie, asociatieId, unit) })),

      replaceForAsociatie: (asociatieId, units) =>
        set((s) => ({ byAsociatie: { ...s.byAsociatie, [asociatieId]: units } })),

      setFetchError: (msg) => set({ fetchError: msg }),
    }),
    {
      name: 'vecini.storage',
      version: 1,
      partialize: (s) => ({ byAsociatie: s.byAsociatie }),
      migrate: (persisted) => ({ byAsociatie: migrateStorageState(persisted) }),
    },
  ),
);

export function useAsociatieStorageUnits(): StorageUnit[] {
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  return useStorageStore((s) => storageForAsociatie(s.byAsociatie, asociatieId));
}
