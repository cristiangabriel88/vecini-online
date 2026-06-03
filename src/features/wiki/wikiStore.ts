import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WikiPage } from '@/shared/types/domain';
import { useAuthStore } from '@/shared/store/authStore';
import {
  type WikiByAsociatie,
  seedWiki,
  wikiForAsociatie,
  addPageIn,
  updatePageIn,
  migrateWikiState,
} from './wikiLogic';

interface WikiState {
  byAsociatie: WikiByAsociatie;
  fetchError: string | null;
  addPage: (asociatieId: string, page: WikiPage) => void;
  updatePage: (asociatieId: string, id: string, title: string, body: string) => void;
  replaceForAsociatie: (asociatieId: string, pages: WikiPage[]) => void;
  setFetchError: (msg: string | null) => void;
}

export const useWikiStore = create<WikiState>()(
  persist(
    (set) => ({
      byAsociatie: seedWiki(),
      fetchError: null,

      addPage: (asociatieId, page) =>
        set((s) => ({ byAsociatie: addPageIn(s.byAsociatie, asociatieId, page) })),

      updatePage: (asociatieId, id, title, body) =>
        set((s) => ({ byAsociatie: updatePageIn(s.byAsociatie, asociatieId, id, title, body) })),

      replaceForAsociatie: (asociatieId, pages) =>
        set((s) => ({ byAsociatie: { ...s.byAsociatie, [asociatieId]: pages } })),

      setFetchError: (msg) => set({ fetchError: msg }),
    }),
    {
      name: 'vecini.wiki',
      version: 1,
      partialize: (s) => ({ byAsociatie: s.byAsociatie }),
      migrate: (persisted) => ({ byAsociatie: migrateWikiState(persisted) }),
    },
  ),
);

export function useAsociatieWiki(): WikiPage[] {
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  return useWikiStore((s) => wikiForAsociatie(s.byAsociatie, asociatieId));
}
