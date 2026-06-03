import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { InsurancePolicy } from '@/shared/types/domain';
import { useAuthStore } from '@/shared/store/authStore';
import {
  type InsuranceByAsociatie,
  insuranceForAsociatie,
  seedInsurance,
  addInsuranceIn,
  migrateInsuranceState,
} from './insuranceLogic';

interface InsuranceState {
  byAsociatie: InsuranceByAsociatie;
  fetchError: string | null;
  addPolicy: (asociatieId: string, policy: InsurancePolicy) => void;
  replaceForAsociatie: (asociatieId: string, policies: InsurancePolicy[]) => void;
  setFetchError: (msg: string | null) => void;
}

export const useInsuranceStore = create<InsuranceState>()(
  persist(
    (set) => ({
      byAsociatie: seedInsurance(),
      fetchError: null,

      addPolicy: (asociatieId, policy) =>
        set((s) => ({ byAsociatie: addInsuranceIn(s.byAsociatie, asociatieId, policy) })),

      replaceForAsociatie: (asociatieId, policies) =>
        set((s) => ({ byAsociatie: { ...s.byAsociatie, [asociatieId]: policies } })),

      setFetchError: (msg) => set({ fetchError: msg }),
    }),
    {
      name: 'vecini.insurance',
      version: 1,
      partialize: (s) => ({ byAsociatie: s.byAsociatie }),
      migrate: (persisted) => ({ byAsociatie: migrateInsuranceState(persisted) }),
    },
  ),
);

export function useAsociatieInsurance(): InsurancePolicy[] {
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  return useInsuranceStore((s) => insuranceForAsociatie(s.byAsociatie, asociatieId));
}
