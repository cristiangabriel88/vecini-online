import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Bike } from '@/shared/types/domain';
import { useAuthStore } from '@/shared/store/authStore';
import {
  type BikesByAsociatie,
  seedBikes,
  bikesForAsociatie,
  addBikeIn,
  toggleAbandonedIn,
  migrateBikesState,
} from './bikeLogic';

interface BikesState {
  byAsociatie: BikesByAsociatie;
  fetchError: string | null;
  addBike: (asociatieId: string, bike: Bike) => void;
  toggleAbandoned: (asociatieId: string, id: string) => void;
  replaceForAsociatie: (asociatieId: string, bikes: Bike[]) => void;
  setFetchError: (msg: string | null) => void;
}

export const useBikesStore = create<BikesState>()(
  persist(
    (set) => ({
      byAsociatie: seedBikes(),
      fetchError: null,

      addBike: (asociatieId, bike) =>
        set((s) => ({ byAsociatie: addBikeIn(s.byAsociatie, asociatieId, bike) })),

      toggleAbandoned: (asociatieId, id) =>
        set((s) => ({ byAsociatie: toggleAbandonedIn(s.byAsociatie, asociatieId, id) })),

      replaceForAsociatie: (asociatieId, bikes) =>
        set((s) => ({ byAsociatie: { ...s.byAsociatie, [asociatieId]: bikes } })),

      setFetchError: (msg) => set({ fetchError: msg }),
    }),
    {
      name: 'vecini.bikes',
      version: 1,
      partialize: (s) => ({ byAsociatie: s.byAsociatie }),
      migrate: (persisted) => ({ byAsociatie: migrateBikesState(persisted) }),
    },
  ),
);

export function useAsociatieBikes(): Bike[] {
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  return useBikesStore((s) => bikesForAsociatie(s.byAsociatie, asociatieId));
}
