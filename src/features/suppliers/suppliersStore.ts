import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Supplier } from '@/shared/types/domain';
import { useAuthStore } from '@/shared/store/authStore';
import {
  type SuppliersByAsociatie,
  seedSuppliers,
  suppliersForAsociatie,
  addSupplierIn,
  migrateSuppliersState,
} from './supplierLogic';

interface SuppliersState {
  byAsociatie: SuppliersByAsociatie;
  fetchError: string | null;
  addSupplier: (asociatieId: string, supplier: Supplier) => void;
  replaceForAsociatie: (asociatieId: string, suppliers: Supplier[]) => void;
  setFetchError: (msg: string | null) => void;
}

export const useSuppliersStore = create<SuppliersState>()(
  persist(
    (set) => ({
      byAsociatie: seedSuppliers(),
      fetchError: null,

      addSupplier: (asociatieId, supplier) =>
        set((s) => ({ byAsociatie: addSupplierIn(s.byAsociatie, asociatieId, supplier) })),

      replaceForAsociatie: (asociatieId, suppliers) =>
        set((s) => ({ byAsociatie: { ...s.byAsociatie, [asociatieId]: suppliers } })),

      setFetchError: (msg) => set({ fetchError: msg }),
    }),
    {
      name: 'vecini.suppliers',
      version: 1,
      partialize: (s) => ({ byAsociatie: s.byAsociatie }),
      migrate: (persisted) => ({ byAsociatie: migrateSuppliersState(persisted) }),
    },
  ),
);

export function useAsociatieSuppliers(): Supplier[] {
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  return useSuppliersStore((s) => suppliersForAsociatie(s.byAsociatie, asociatieId));
}
