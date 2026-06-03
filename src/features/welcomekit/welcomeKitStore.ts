import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WelcomeKitItem } from '@/shared/types/domain';
import { useAuthStore } from '@/shared/store/authStore';
import {
  type WelcomeKitsByAsociatie,
  seedWelcomeKit,
  welcomeKitForAsociatie,
  addWelcomeKitItemIn,
  removeWelcomeKitItemIn,
  migrateWelcomeKitState,
  nextOrder,
} from './welcomeKitLogic';

interface WelcomeKitState {
  byAsociatie: WelcomeKitsByAsociatie;
  doneIds: string[];
  fetchError: string | null;
  addItem: (asociatieId: string, title: string, body: string) => void;
  removeItem: (asociatieId: string, itemId: string) => void;
  toggleDone: (itemId: string) => void;
  replaceForAsociatie: (asociatieId: string, items: WelcomeKitItem[]) => void;
  addLiveItem: (asociatieId: string, item: WelcomeKitItem) => void;
  setFetchError: (msg: string | null) => void;
}

export const useWelcomeKitStore = create<WelcomeKitState>()(
  persist(
    (set) => ({
      byAsociatie: seedWelcomeKit(),
      doneIds: [],
      fetchError: null,

      addItem: (asociatieId, title, body) =>
        set((s) => {
          const current = s.byAsociatie[asociatieId] ?? [];
          const item: WelcomeKitItem = {
            id: `wk-${Date.now()}`,
            asociatie_id: asociatieId,
            order: nextOrder(current),
            title,
            body,
          };
          return { byAsociatie: addWelcomeKitItemIn(s.byAsociatie, asociatieId, item) };
        }),

      removeItem: (asociatieId, itemId) =>
        set((s) => ({
          byAsociatie: removeWelcomeKitItemIn(s.byAsociatie, asociatieId, itemId),
          doneIds: s.doneIds.filter((id) => id !== itemId),
        })),

      toggleDone: (itemId) =>
        set((s) => ({
          doneIds: s.doneIds.includes(itemId)
            ? s.doneIds.filter((id) => id !== itemId)
            : [...s.doneIds, itemId],
        })),

      replaceForAsociatie: (asociatieId, items) =>
        set((s) => ({ byAsociatie: { ...s.byAsociatie, [asociatieId]: items } })),

      addLiveItem: (asociatieId, item) =>
        set((s) => ({ byAsociatie: addWelcomeKitItemIn(s.byAsociatie, asociatieId, item) })),

      setFetchError: (msg) => set({ fetchError: msg }),
    }),
    {
      name: 'vecini.welcomekit',
      version: 1,
      partialize: (s) => ({ byAsociatie: s.byAsociatie, doneIds: s.doneIds }),
      migrate: (persisted) => {
        const p = persisted as { byAsociatie?: WelcomeKitsByAsociatie; doneIds?: string[] } | null;
        return {
          byAsociatie: migrateWelcomeKitState(persisted),
          doneIds: p?.doneIds ?? [],
        };
      },
    },
  ),
);

export function useAsociatieWelcomeKit(): WelcomeKitItem[] {
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  return useWelcomeKitStore((s) => welcomeKitForAsociatie(s.byAsociatie, asociatieId));
}
