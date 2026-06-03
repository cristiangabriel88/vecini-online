import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SkillOffering } from '@/shared/types/domain';
import { useAuthStore } from '@/shared/store/authStore';
import {
  type BarterByAsociatie,
  seedBarter,
  barterForAsociatie,
  upsertOfferingIn,
  removeOfferingIn,
  migrateBarterState,
} from './barterLogic';

interface BarterState {
  byAsociatie: BarterByAsociatie;
  fetchError: string | null;
  upsertOffering: (asociatieId: string, offering: SkillOffering) => void;
  removeOffering: (asociatieId: string, userId: string) => void;
  replaceForAsociatie: (asociatieId: string, items: SkillOffering[]) => void;
  setFetchError: (msg: string | null) => void;
}

export const useBarterStore = create<BarterState>()(
  persist(
    (set) => ({
      byAsociatie: seedBarter(),
      fetchError: null,

      upsertOffering: (asociatieId, offering) =>
        set((s) => ({ byAsociatie: upsertOfferingIn(s.byAsociatie, asociatieId, offering) })),

      removeOffering: (asociatieId, userId) =>
        set((s) => ({ byAsociatie: removeOfferingIn(s.byAsociatie, asociatieId, userId) })),

      replaceForAsociatie: (asociatieId, items) =>
        set((s) => ({ byAsociatie: { ...s.byAsociatie, [asociatieId]: items } })),

      setFetchError: (msg) => set({ fetchError: msg }),
    }),
    {
      name: 'vecini.barter',
      version: 1,
      partialize: (s) => ({ byAsociatie: s.byAsociatie }),
      migrate: (persisted) => ({ byAsociatie: migrateBarterState(persisted) }),
    },
  ),
);

export function useAsociatieBarter(): SkillOffering[] {
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  return useBarterStore((s) => barterForAsociatie(s.byAsociatie, asociatieId));
}
