import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BirthdayConsent } from '@/shared/types/domain';
import { useAuthStore } from '@/shared/store/authStore';
import {
  type BirthdaysByAsociatie,
  seedBirthdays,
  birthdaysForAsociatie,
  upsertBirthdayIn,
  removeBirthdayIn,
  migrateBirthdaysState,
} from './birthdaysLogic';

interface BirthdaysState {
  byAsociatie: BirthdaysByAsociatie;
  fetchError: string | null;
  upsertConsent: (asociatieId: string, consent: BirthdayConsent) => void;
  removeConsent: (asociatieId: string, userId: string) => void;
  replaceForAsociatie: (asociatieId: string, items: BirthdayConsent[]) => void;
  setFetchError: (msg: string | null) => void;
}

export const useBirthdaysStore = create<BirthdaysState>()(
  persist(
    (set) => ({
      byAsociatie: seedBirthdays(),
      fetchError: null,

      upsertConsent: (asociatieId, consent) =>
        set((s) => ({ byAsociatie: upsertBirthdayIn(s.byAsociatie, asociatieId, consent) })),

      removeConsent: (asociatieId, userId) =>
        set((s) => ({ byAsociatie: removeBirthdayIn(s.byAsociatie, asociatieId, userId) })),

      replaceForAsociatie: (asociatieId, items) =>
        set((s) => ({ byAsociatie: { ...s.byAsociatie, [asociatieId]: items } })),

      setFetchError: (msg) => set({ fetchError: msg }),
    }),
    {
      name: 'vecini.birthdays',
      version: 1,
      partialize: (s) => ({ byAsociatie: s.byAsociatie }),
      migrate: (persisted) => ({ byAsociatie: migrateBirthdaysState(persisted) }),
    },
  ),
);

export function useAsociatieBirthdays(): BirthdayConsent[] {
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  return useBirthdaysStore((s) => birthdaysForAsociatie(s.byAsociatie, asociatieId));
}
