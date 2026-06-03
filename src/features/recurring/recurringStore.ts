import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useAuthStore } from '@/shared/store/authStore';
import {
  type AcknowledgedByAsociatie,
  seedAcknowledged,
  toggleAckIn,
  migrateAcknowledgedState,
} from './recurringLogic';

interface RecurringState {
  byAsociatie: AcknowledgedByAsociatie;
  fetchError: string | null;
  toggleAck: (asociatieId: string, key: string) => void;
  setFetchError: (msg: string | null) => void;
}

export const useRecurringStore = create<RecurringState>()(
  persist(
    (set) => ({
      byAsociatie: seedAcknowledged(),
      fetchError: null,

      toggleAck: (asociatieId, key) =>
        set((s) => ({ byAsociatie: toggleAckIn(s.byAsociatie, asociatieId, key) })),

      setFetchError: (msg) => set({ fetchError: msg }),
    }),
    {
      name: 'vecini.recurring',
      version: 1,
      partialize: (s) => ({ byAsociatie: s.byAsociatie }),
      migrate: (persisted) => ({ byAsociatie: migrateAcknowledgedState(persisted) }),
    },
  ),
);

export function useRecurringAcknowledged(): string[] {
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  return useRecurringStore((s) => s.byAsociatie[asociatieId ?? ''] ?? []);
}
