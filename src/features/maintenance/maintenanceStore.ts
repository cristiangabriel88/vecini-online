import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ScheduledMaintenance } from '@/shared/types/domain';
import { useAuthStore } from '@/shared/store/authStore';
import {
  type MaintenancesByAsociatie,
  seedMaintenance,
  maintenanceForAsociatie,
  addMaintenanceIn,
  markDoneIn,
  migrateMaintenanceState,
} from './maintenanceLogic';

export interface NewMaintenance {
  title: string;
  vendor: string;
  recurrence: string;
  nextDue: string;
  notes: string;
}

interface MaintenanceState {
  byAsociatie: MaintenancesByAsociatie;
  fetchError: string | null;
  addItem: (asociatieId: string, item: ScheduledMaintenance) => void;
  markDoneLocal: (asociatieId: string, id: string, rollForwardDays: number) => void;
  replaceForAsociatie: (asociatieId: string, items: ScheduledMaintenance[]) => void;
  setFetchError: (msg: string | null) => void;
}

export const useMaintenanceStore = create<MaintenanceState>()(
  persist(
    (set) => ({
      byAsociatie: seedMaintenance(),
      fetchError: null,

      addItem: (asociatieId, item) =>
        set((s) => ({ byAsociatie: addMaintenanceIn(s.byAsociatie, asociatieId, item) })),

      markDoneLocal: (asociatieId, id, rollForwardDays) =>
        set((s) => ({ byAsociatie: markDoneIn(s.byAsociatie, asociatieId, id, rollForwardDays) })),

      replaceForAsociatie: (asociatieId, items) =>
        set((s) => ({ byAsociatie: { ...s.byAsociatie, [asociatieId]: items } })),

      setFetchError: (msg) => set({ fetchError: msg }),
    }),
    {
      name: 'vecini.maintenance',
      version: 1,
      partialize: (s) => ({ byAsociatie: s.byAsociatie }),
      migrate: (persisted) => ({ byAsociatie: migrateMaintenanceState(persisted) }),
    },
  ),
);

/** Hook: scheduled maintenance list for the currently active asociatie. */
export function useAsociatieMaintenance(): ScheduledMaintenance[] {
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  return useMaintenanceStore((s) => maintenanceForAsociatie(s.byAsociatie, asociatieId));
}
