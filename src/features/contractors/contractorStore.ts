import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Contractor } from '@/shared/types/domain';
import { useAuthStore } from '@/shared/store/authStore';
import {
  type ContractorsByAsociatie,
  seedContractors,
  contractorsForAsociatie,
  addContractorIn,
  migrateContractorsState,
  applyRating,
} from './contractorLogic';

interface ContractorState {
  byAsociatie: ContractorsByAsociatie;
  fetchError: string | null;
  addContractor: (asociatieId: string, contractor: Contractor) => void;
  rateContractor: (asociatieId: string, id: string, value: number) => void;
  toggleAvailable: (asociatieId: string, id: string) => void;
  replaceForAsociatie: (asociatieId: string, contractors: Contractor[]) => void;
  setFetchError: (msg: string | null) => void;
}

export const useContractorStore = create<ContractorState>()(
  persist(
    (set) => ({
      byAsociatie: seedContractors(),
      fetchError: null,

      addContractor: (asociatieId, contractor) =>
        set((s) => ({ byAsociatie: addContractorIn(s.byAsociatie, asociatieId, contractor) })),

      rateContractor: (asociatieId, id, value) =>
        set((s) => {
          const list = s.byAsociatie[asociatieId] ?? [];
          return {
            byAsociatie: {
              ...s.byAsociatie,
              [asociatieId]: list.map((c) =>
                c.id === id ? { ...c, ...applyRating(c, value) } : c,
              ),
            },
          };
        }),

      toggleAvailable: (asociatieId, id) =>
        set((s) => {
          const list = s.byAsociatie[asociatieId] ?? [];
          return {
            byAsociatie: {
              ...s.byAsociatie,
              [asociatieId]: list.map((c) =>
                c.id === id ? { ...c, available: !c.available } : c,
              ),
            },
          };
        }),

      replaceForAsociatie: (asociatieId, contractors) =>
        set((s) => ({ byAsociatie: { ...s.byAsociatie, [asociatieId]: contractors } })),

      setFetchError: (msg) => set({ fetchError: msg }),
    }),
    {
      name: 'vecini.contractors',
      version: 1,
      partialize: (s) => ({ byAsociatie: s.byAsociatie }),
      migrate: (persisted) => ({ byAsociatie: migrateContractorsState(persisted) }),
    },
  ),
);

export function useAsociatieContractors(): Contractor[] {
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  return useContractorStore((s) => contractorsForAsociatie(s.byAsociatie, asociatieId));
}
