import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GlossaryEntry } from '@/shared/types/domain';
import { useAuthStore } from '@/shared/store/authStore';
import {
  type GlossaryByAsociatie,
  seedGlossary,
  glossaryForAsociatie,
  migrateGlossaryState,
} from './glossaryLogic';

interface GlossaryState {
  byAsociatie: GlossaryByAsociatie;
  fetchError: string | null;
  replaceForAsociatie: (asociatieId: string, entries: GlossaryEntry[]) => void;
  setFetchError: (msg: string | null) => void;
}

export const useGlossaryStore = create<GlossaryState>()(
  persist(
    (set) => ({
      byAsociatie: seedGlossary(),
      fetchError: null,

      replaceForAsociatie: (asociatieId, entries) =>
        set((s) => ({ byAsociatie: { ...s.byAsociatie, [asociatieId]: entries } })),

      setFetchError: (msg) => set({ fetchError: msg }),
    }),
    {
      name: 'vecini.glossary',
      version: 1,
      partialize: (s) => ({ byAsociatie: s.byAsociatie }),
      migrate: (persisted) => ({ byAsociatie: migrateGlossaryState(persisted) }),
    },
  ),
);

export function useAsociatieGlossary(): GlossaryEntry[] {
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  return useGlossaryStore((s) => glossaryForAsociatie(s.byAsociatie, asociatieId));
}
