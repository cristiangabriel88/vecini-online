import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { RepairRecord } from '@/shared/types/domain';
import { useAuthStore } from '@/shared/store/authStore';
import {
  type RepairsByAsociatie,
  seedRepairs,
  repairsForAsociatie,
  addRepairIn,
  migrateRepairsState,
} from './repairLogic';

interface RepairRecordsState {
  byAsociatie: RepairsByAsociatie;
  fetchError: string | null;
  addRecord: (asociatieId: string, record: RepairRecord) => void;
  replaceForAsociatie: (asociatieId: string, records: RepairRecord[]) => void;
  setFetchError: (msg: string | null) => void;
}

export const useRepairRecordsStore = create<RepairRecordsState>()(
  persist(
    (set) => ({
      byAsociatie: seedRepairs(),
      fetchError: null,

      addRecord: (asociatieId, record) =>
        set((s) => ({ byAsociatie: addRepairIn(s.byAsociatie, asociatieId, record) })),

      replaceForAsociatie: (asociatieId, records) =>
        set((s) => ({ byAsociatie: { ...s.byAsociatie, [asociatieId]: records } })),

      setFetchError: (msg) => set({ fetchError: msg }),
    }),
    {
      name: 'vecini.repair-records',
      version: 1,
      partialize: (s) => ({ byAsociatie: s.byAsociatie }),
      migrate: (persisted) => ({ byAsociatie: migrateRepairsState(persisted) }),
    },
  ),
);

/** Hook: repair records for the currently active asociatie. */
export function useAsociatieRepairs(): RepairRecord[] {
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  return useRepairRecordsStore((s) => repairsForAsociatie(s.byAsociatie, asociatieId));
}
