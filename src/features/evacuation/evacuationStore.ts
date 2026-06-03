import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { EvacuationPlan, PetMarker } from '@/shared/types/domain';
import { useAuthStore } from '@/shared/store/authStore';
import {
  type EvacuationByAsociatie,
  type EvacuationData,
  evacuationForAsociatie,
  seedEvacuation,
  addPlanIn,
  setMarkerIn,
  clearMarkerIn,
  migrateEvacuationState,
} from './evacuationLogic';

interface EvacuationState {
  byAsociatie: EvacuationByAsociatie;
  fetchError: string | null;
  addPlan: (asociatieId: string, plan: EvacuationPlan) => void;
  setMarker: (asociatieId: string, marker: PetMarker) => void;
  clearMarker: (asociatieId: string, userId: string, apartmentId: string) => void;
  replaceForAsociatie: (asociatieId: string, data: EvacuationData) => void;
  setFetchError: (msg: string | null) => void;
}

export const useEvacuationStore = create<EvacuationState>()(
  persist(
    (set) => ({
      byAsociatie: seedEvacuation(),
      fetchError: null,

      addPlan: (asociatieId, plan) =>
        set((s) => ({ byAsociatie: addPlanIn(s.byAsociatie, asociatieId, plan) })),

      setMarker: (asociatieId, marker) =>
        set((s) => ({ byAsociatie: setMarkerIn(s.byAsociatie, asociatieId, marker) })),

      clearMarker: (asociatieId, userId, apartmentId) =>
        set((s) => ({ byAsociatie: clearMarkerIn(s.byAsociatie, asociatieId, userId, apartmentId) })),

      replaceForAsociatie: (asociatieId, data) =>
        set((s) => ({ byAsociatie: { ...s.byAsociatie, [asociatieId]: data } })),

      setFetchError: (msg) => set({ fetchError: msg }),
    }),
    {
      name: 'vecini.evacuation',
      version: 1,
      partialize: (s) => ({ byAsociatie: s.byAsociatie }),
      migrate: (persisted) => ({ byAsociatie: migrateEvacuationState(persisted) }),
    },
  ),
);

export function useAsociatieEvacuation(): EvacuationData {
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  return useEvacuationStore((s) => evacuationForAsociatie(s.byAsociatie, asociatieId));
}
