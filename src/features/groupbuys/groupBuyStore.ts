import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GroupBuy } from '@/shared/types/domain';
import { useAuthStore } from '@/shared/store/authStore';
import {
  type GroupBuysByAsociatie,
  seedGroupBuys,
  groupBuysForAsociatie,
  addGroupBuyIn,
  incrementSignupsIn,
  migrateGroupBuysState,
} from './groupBuyLogic';

interface GroupBuyState {
  byAsociatie: GroupBuysByAsociatie;
  joinedIds: string[];
  fetchError: string | null;
  addBuy: (asociatieId: string, buy: GroupBuy) => void;
  joinBuy: (asociatieId: string, buyId: string) => void;
  replaceForAsociatie: (asociatieId: string, items: GroupBuy[]) => void;
  setFetchError: (msg: string | null) => void;
}

export const useGroupBuyStore = create<GroupBuyState>()(
  persist(
    (set, get) => ({
      byAsociatie: seedGroupBuys(),
      joinedIds: [],
      fetchError: null,

      addBuy: (asociatieId, buy) =>
        set((s) => ({ byAsociatie: addGroupBuyIn(s.byAsociatie, asociatieId, buy) })),

      joinBuy: (asociatieId, buyId) => {
        if (get().joinedIds.includes(buyId)) return;
        set((s) => ({
          joinedIds: [...s.joinedIds, buyId],
          byAsociatie: incrementSignupsIn(s.byAsociatie, asociatieId, buyId),
        }));
      },

      replaceForAsociatie: (asociatieId, items) =>
        set((s) => ({ byAsociatie: { ...s.byAsociatie, [asociatieId]: items } })),

      setFetchError: (msg) => set({ fetchError: msg }),
    }),
    {
      name: 'vecini.groupbuys',
      version: 1,
      partialize: (s) => ({ byAsociatie: s.byAsociatie, joinedIds: s.joinedIds }),
      migrate: (persisted) => {
        const p = persisted as { byAsociatie?: GroupBuysByAsociatie; joinedIds?: string[] } | null;
        return {
          byAsociatie: migrateGroupBuysState(persisted),
          joinedIds: p?.joinedIds ?? [],
        };
      },
    },
  ),
);

export function useAsociatieGroupBuys(): GroupBuy[] {
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  return useGroupBuyStore((s) => groupBuysForAsociatie(s.byAsociatie, asociatieId));
}
