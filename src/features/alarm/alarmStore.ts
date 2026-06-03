import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AlarmSystem } from '@/shared/types/domain';
import { useAuthStore } from '@/shared/store/authStore';
import {
  type AlarmByAsociatie,
  alarmForAsociatie,
  seedAlarmSystems,
  addAlarmIn,
  logTestIn,
  reportFaultIn,
  migrateAlarmState,
} from './alarmLogic';

interface AlarmState {
  byAsociatie: AlarmByAsociatie;
  fetchError: string | null;
  addSystem: (asociatieId: string, system: AlarmSystem) => void;
  logTest: (asociatieId: string, id: string) => void;
  reportFault: (asociatieId: string, id: string) => void;
  replaceForAsociatie: (asociatieId: string, systems: AlarmSystem[]) => void;
  setFetchError: (msg: string | null) => void;
}

export const useAlarmStore = create<AlarmState>()(
  persist(
    (set) => ({
      byAsociatie: seedAlarmSystems(),
      fetchError: null,

      addSystem: (asociatieId, system) =>
        set((s) => ({ byAsociatie: addAlarmIn(s.byAsociatie, asociatieId, system) })),

      logTest: (asociatieId, id) =>
        set((s) => ({ byAsociatie: logTestIn(s.byAsociatie, asociatieId, id) })),

      reportFault: (asociatieId, id) =>
        set((s) => ({ byAsociatie: reportFaultIn(s.byAsociatie, asociatieId, id) })),

      replaceForAsociatie: (asociatieId, systems) =>
        set((s) => ({ byAsociatie: { ...s.byAsociatie, [asociatieId]: systems } })),

      setFetchError: (msg) => set({ fetchError: msg }),
    }),
    {
      name: 'vecini.alarm',
      version: 1,
      partialize: (s) => ({ byAsociatie: s.byAsociatie }),
      migrate: (persisted) => ({ byAsociatie: migrateAlarmState(persisted) }),
    },
  ),
);

export function useAsociatieAlarm(): AlarmSystem[] {
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  return useAlarmStore((s) => alarmForAsociatie(s.byAsociatie, asociatieId));
}
