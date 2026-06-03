import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Crowdfund } from '@/shared/types/domain';
import { useAuthStore } from '@/shared/store/authStore';
import {
  type CrowdfundsByAsociatie,
  seedCrowdfunds,
  crowdfundsForAsociatie,
  addCrowdfundIn,
  migrateCrowdfundsState,
} from './crowdfundLogic';

interface CrowdfundState {
  byAsociatie: CrowdfundsByAsociatie;
  myPledged: string[];
  fetchError: string | null;
  addFund: (asociatieId: string, fund: Crowdfund) => void;
  pledge: (asociatieId: string, id: string, amount: number) => void;
  replaceForAsociatie: (asociatieId: string, funds: Crowdfund[], pledgedIds: string[]) => void;
  setFetchError: (msg: string | null) => void;
}

export const useCrowdfundStore = create<CrowdfundState>()(
  persist(
    (set, get) => ({
      byAsociatie: seedCrowdfunds(),
      myPledged: [],
      fetchError: null,

      addFund: (asociatieId, fund) =>
        set((s) => ({ byAsociatie: addCrowdfundIn(s.byAsociatie, asociatieId, fund) })),

      pledge: (asociatieId, id, amount) => {
        if (get().myPledged.includes(id)) return;
        set((s) => {
          const list = s.byAsociatie[asociatieId] ?? [];
          return {
            myPledged: [...s.myPledged, id],
            byAsociatie: {
              ...s.byAsociatie,
              [asociatieId]: list.map((c) =>
                c.id === id ? { ...c, pledged: c.pledged + amount } : c,
              ),
            },
          };
        });
      },

      replaceForAsociatie: (asociatieId, funds, pledgedIds) =>
        set((s) => ({
          byAsociatie: { ...s.byAsociatie, [asociatieId]: funds },
          myPledged: [...new Set([...s.myPledged, ...pledgedIds])],
        })),

      setFetchError: (msg) => set({ fetchError: msg }),
    }),
    {
      name: 'vecini.crowdfund',
      version: 1,
      partialize: (s) => ({ byAsociatie: s.byAsociatie, myPledged: s.myPledged }),
      migrate: (persisted) => {
        const p = persisted as { byAsociatie?: CrowdfundsByAsociatie; myPledged?: string[] } | null;
        return {
          byAsociatie: migrateCrowdfundsState(p),
          myPledged: p?.myPledged ?? [],
        };
      },
    },
  ),
);

export function useAsociatieCrowdfunds(): Crowdfund[] {
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  return useCrowdfundStore((s) => crowdfundsForAsociatie(s.byAsociatie, asociatieId));
}
