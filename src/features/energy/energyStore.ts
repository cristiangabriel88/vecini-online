import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { EnergyRecord } from '@/shared/types/domain';
import { useAuthStore } from '@/shared/store/authStore';
import {
  type EnergyByAsociatie,
  seedEnergy,
  energyForAsociatie,
  addEnergyIn,
  migrateEnergyState,
} from './energyLogic';

interface EnergyState {
  byAsociatie: EnergyByAsociatie;
  fetchError: string | null;
  addRecord: (asociatieId: string, record: EnergyRecord) => void;
  replaceForAsociatie: (asociatieId: string, records: EnergyRecord[]) => void;
  setFetchError: (msg: string | null) => void;
}

export const useEnergyStore = create<EnergyState>()(
  persist(
    (set) => ({
      byAsociatie: seedEnergy(),
      fetchError: null,

      addRecord: (asociatieId, record) =>
        set((s) => ({ byAsociatie: addEnergyIn(s.byAsociatie, asociatieId, record) })),

      replaceForAsociatie: (asociatieId, records) =>
        set((s) => ({ byAsociatie: { ...s.byAsociatie, [asociatieId]: records } })),

      setFetchError: (msg) => set({ fetchError: msg }),
    }),
    {
      name: 'vecini.energy',
      version: 1,
      partialize: (s) => ({ byAsociatie: s.byAsociatie }),
      migrate: (persisted) => ({ byAsociatie: migrateEnergyState(persisted) }),
    },
  ),
);

export function useAsociatieEnergy(): EnergyRecord[] {
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  return useEnergyStore((s) => energyForAsociatie(s.byAsociatie, asociatieId));
}
