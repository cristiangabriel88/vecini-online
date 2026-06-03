import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ThankYou } from '@/shared/types/domain';
import { useAuthStore } from '@/shared/store/authStore';
import {
  type ThankYousByAsociatie,
  seedThankYous,
  thankYousForAsociatie,
  addThankYouIn,
  migrateThankYousState,
} from './thankYouLogic';

interface ThankYousState {
  byAsociatie: ThankYousByAsociatie;
  fetchError: string | null;
  addItem: (asociatieId: string, item: ThankYou) => void;
  replaceForAsociatie: (asociatieId: string, items: ThankYou[]) => void;
  setFetchError: (msg: string | null) => void;
}

export const useThankYousStore = create<ThankYousState>()(
  persist(
    (set) => ({
      byAsociatie: seedThankYous(),
      fetchError: null,

      addItem: (asociatieId, item) =>
        set((s) => ({ byAsociatie: addThankYouIn(s.byAsociatie, asociatieId, item) })),

      replaceForAsociatie: (asociatieId, items) =>
        set((s) => ({ byAsociatie: { ...s.byAsociatie, [asociatieId]: items } })),

      setFetchError: (msg) => set({ fetchError: msg }),
    }),
    {
      name: 'vecini.thankyous',
      version: 1,
      partialize: (s) => ({ byAsociatie: s.byAsociatie }),
      migrate: (persisted) => ({ byAsociatie: migrateThankYousState(persisted) }),
    },
  ),
);

export function useAsociatieThankYous(): ThankYou[] {
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  return useThankYousStore((s) => thankYousForAsociatie(s.byAsociatie, asociatieId));
}
