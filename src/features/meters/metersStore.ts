import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Meter, MeterReading } from '@/shared/types/domain';
import { useAuthStore } from '@/shared/store/authStore';
import {
  type MeterCatalog,
  type MetersByAsociatie,
  seedMeters,
  metersForAsociatie,
  applyReadingToCatalog,
  migrateMetersState,
} from './meterLogic';

interface MetersState {
  byAsociatie: MetersByAsociatie;
  fetchError: string | null;
  submitReading: (asociatieId: string, meterId: string, reading: MeterReading) => void;
  replaceForAsociatie: (asociatieId: string, meters: Meter[], readings: MeterReading[]) => void;
  setFetchError: (msg: string | null) => void;
}

export const useMetersStore = create<MetersState>()(
  persist(
    (set) => ({
      byAsociatie: seedMeters(),
      fetchError: null,

      submitReading: (asociatieId, meterId, reading) =>
        set((s) => {
          const catalog = metersForAsociatie(s.byAsociatie, asociatieId);
          return {
            byAsociatie: {
              ...s.byAsociatie,
              [asociatieId]: applyReadingToCatalog(catalog, meterId, reading),
            },
          };
        }),

      replaceForAsociatie: (asociatieId, meters, readings) =>
        set((s) => ({
          byAsociatie: { ...s.byAsociatie, [asociatieId]: { meters, readings } },
        })),

      setFetchError: (msg) => set({ fetchError: msg }),
    }),
    {
      name: 'vecini.meters',
      version: 1,
      partialize: (s) => ({ byAsociatie: s.byAsociatie }),
      migrate: (persisted) => ({ byAsociatie: migrateMetersState(persisted) }),
    },
  ),
);

/** Hook: meter catalog (meters + readings) for the currently active asociatie. */
export function useAsociatieMeters(): MeterCatalog {
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  return useMetersStore((s) => metersForAsociatie(s.byAsociatie, asociatieId));
}
