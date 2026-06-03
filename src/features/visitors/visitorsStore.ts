import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { VisitorReport } from '@/shared/types/domain';
import { useAuthStore } from '@/shared/store/authStore';
import {
  type VisitorsByAsociatie,
  visitorsForAsociatie,
  seedVisitors,
  addVisitorIn,
  cycleStatusIn,
  migrateVisitorsState,
} from './visitorLogic';

interface VisitorsState {
  byAsociatie: VisitorsByAsociatie;
  fetchError: string | null;
  addReport: (asociatieId: string, report: VisitorReport) => void;
  cycleStatus: (asociatieId: string, id: string) => void;
  replaceForAsociatie: (asociatieId: string, reports: VisitorReport[]) => void;
  setFetchError: (msg: string | null) => void;
}

export const useVisitorsStore = create<VisitorsState>()(
  persist(
    (set) => ({
      byAsociatie: seedVisitors(),
      fetchError: null,

      addReport: (asociatieId, report) =>
        set((s) => ({ byAsociatie: addVisitorIn(s.byAsociatie, asociatieId, report) })),

      cycleStatus: (asociatieId, id) =>
        set((s) => ({ byAsociatie: cycleStatusIn(s.byAsociatie, asociatieId, id) })),

      replaceForAsociatie: (asociatieId, reports) =>
        set((s) => ({ byAsociatie: { ...s.byAsociatie, [asociatieId]: reports } })),

      setFetchError: (msg) => set({ fetchError: msg }),
    }),
    {
      name: 'vecini.visitors',
      version: 1,
      partialize: (s) => ({ byAsociatie: s.byAsociatie }),
      migrate: (persisted) => ({ byAsociatie: migrateVisitorsState(persisted) }),
    },
  ),
);

export function useAsociatieVisitors(): VisitorReport[] {
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  return useVisitorsStore((s) => visitorsForAsociatie(s.byAsociatie, asociatieId));
}
