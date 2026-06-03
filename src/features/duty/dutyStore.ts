import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DutySlot } from '@/shared/types/domain';
import { useAuthStore } from '@/shared/store/authStore';
import {
  type DutyByAsociatie,
  seedDuty,
  dutyForAsociatie,
  signUpIn,
  releaseIn,
  migrateDutyState,
} from './dutyLogic';

interface DutyState {
  byAsociatie: DutyByAsociatie;
  fetchError: string | null;
  signUp: (
    asociatieId: string,
    id: string,
    volunteerId: string,
    volunteerName: string,
    note: string,
  ) => void;
  release: (asociatieId: string, id: string) => void;
  replaceForAsociatie: (asociatieId: string, slots: DutySlot[]) => void;
  setFetchError: (msg: string | null) => void;
}

export const useDutyStore = create<DutyState>()(
  persist(
    (set) => ({
      byAsociatie: seedDuty(),
      fetchError: null,

      signUp: (asociatieId, id, volunteerId, volunteerName, note) =>
        set((s) => ({
          byAsociatie: signUpIn(
            s.byAsociatie,
            asociatieId,
            id,
            volunteerId,
            volunteerName,
            note.trim() || null,
          ),
        })),

      release: (asociatieId, id) =>
        set((s) => ({ byAsociatie: releaseIn(s.byAsociatie, asociatieId, id) })),

      replaceForAsociatie: (asociatieId, slots) =>
        set((s) => ({ byAsociatie: { ...s.byAsociatie, [asociatieId]: slots } })),

      setFetchError: (msg) => set({ fetchError: msg }),
    }),
    {
      name: 'vecini.duty',
      version: 1,
      partialize: (s) => ({ byAsociatie: s.byAsociatie }),
      migrate: (persisted) => ({ byAsociatie: migrateDutyState(persisted) }),
    },
  ),
);

export function useAsociatieDuty(): DutySlot[] {
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  return useDutyStore((s) => dutyForAsociatie(s.byAsociatie, asociatieId));
}
