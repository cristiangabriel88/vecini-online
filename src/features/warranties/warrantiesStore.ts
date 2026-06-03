import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Warranty } from '@/shared/types/domain';
import { useAuthStore } from '@/shared/store/authStore';
import {
  type WarrantiesByAsociatie,
  seedWarranties,
  warrantiesForAsociatie,
  addWarrantyIn,
  migrateWarrantiesState,
} from './warrantyLogic';

interface WarrantiesState {
  byAsociatie: WarrantiesByAsociatie;
  fetchError: string | null;
  addWarranty: (asociatieId: string, warranty: Warranty) => void;
  replaceForAsociatie: (asociatieId: string, warranties: Warranty[]) => void;
  setFetchError: (msg: string | null) => void;
}

export const useWarrantiesStore = create<WarrantiesState>()(
  persist(
    (set) => ({
      byAsociatie: seedWarranties(),
      fetchError: null,

      addWarranty: (asociatieId, warranty) =>
        set((s) => ({ byAsociatie: addWarrantyIn(s.byAsociatie, asociatieId, warranty) })),

      replaceForAsociatie: (asociatieId, warranties) =>
        set((s) => ({ byAsociatie: { ...s.byAsociatie, [asociatieId]: warranties } })),

      setFetchError: (msg) => set({ fetchError: msg }),
    }),
    {
      name: 'vecini.warranties',
      version: 1,
      partialize: (s) => ({ byAsociatie: s.byAsociatie }),
      migrate: (persisted) => ({ byAsociatie: migrateWarrantiesState(persisted) }),
    },
  ),
);

export function useAsociatieWarranties(): Warranty[] {
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  return useWarrantiesStore((s) => warrantiesForAsociatie(s.byAsociatie, asociatieId));
}
