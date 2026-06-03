import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ParkingSpot } from '@/shared/types/domain';
import { useAuthStore } from '@/shared/store/authStore';
import {
  type ParkingByAsociatie,
  seedParking,
  parkingForAsociatie,
  addParkingIn,
  migrateParkingState,
} from './parkingLogic';

interface ParkingState {
  byAsociatie: ParkingByAsociatie;
  fetchError: string | null;
  addSpot: (asociatieId: string, spot: ParkingSpot) => void;
  replaceForAsociatie: (asociatieId: string, spots: ParkingSpot[]) => void;
  setFetchError: (msg: string | null) => void;
}

export const useParkingStore = create<ParkingState>()(
  persist(
    (set) => ({
      byAsociatie: seedParking(),
      fetchError: null,

      addSpot: (asociatieId, spot) =>
        set((s) => ({ byAsociatie: addParkingIn(s.byAsociatie, asociatieId, spot) })),

      replaceForAsociatie: (asociatieId, spots) =>
        set((s) => ({ byAsociatie: { ...s.byAsociatie, [asociatieId]: spots } })),

      setFetchError: (msg) => set({ fetchError: msg }),
    }),
    {
      name: 'vecini.parking',
      version: 1,
      partialize: (s) => ({ byAsociatie: s.byAsociatie }),
      migrate: (persisted) => ({ byAsociatie: migrateParkingState(persisted) }),
    },
  ),
);

export function useAsociatieParking(): ParkingSpot[] {
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  return useParkingStore((s) => parkingForAsociatie(s.byAsociatie, asociatieId));
}
