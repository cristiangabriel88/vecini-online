import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MarketplaceListing } from '@/shared/types/domain';
import { useAuthStore } from '@/shared/store/authStore';
import { recordTimestamp, pruneTimestamps } from '@/shared/lib/contentGuard';
import {
  type MarketplacesByAsociatie,
  seedMarketplace,
  marketplaceForAsociatie,
  addListingIn,
  migrateMarketplaceState,
} from './marketplaceLogic';

interface MarketplaceState {
  byAsociatie: MarketplacesByAsociatie;
  fetchError: string | null;
  /** Per-user listing timestamps keyed by `${asociatieId}:${userId}`. Not persisted. */
  postTimestamps: Record<string, number[]>;
  addListing: (asociatieId: string, item: MarketplaceListing) => void;
  replaceForAsociatie: (asociatieId: string, items: MarketplaceListing[]) => void;
  setFetchError: (msg: string | null) => void;
  recordPost: (asociatieId: string, userId: string, now?: number) => void;
}

export const useMarketplaceStore = create<MarketplaceState>()(
  persist(
    (set) => ({
      byAsociatie: seedMarketplace(),
      fetchError: null,
      postTimestamps: {},

      addListing: (asociatieId, item) =>
        set((s) => ({ byAsociatie: addListingIn(s.byAsociatie, asociatieId, item) })),

      replaceForAsociatie: (asociatieId, items) =>
        set((s) => ({ byAsociatie: { ...s.byAsociatie, [asociatieId]: items } })),

      setFetchError: (msg) => set({ fetchError: msg }),

      recordPost: (asociatieId, userId, now = Date.now()) =>
        set((s) => {
          const key = `${asociatieId}:${userId}`;
          return {
            postTimestamps: {
              ...s.postTimestamps,
              [key]: recordTimestamp(s.postTimestamps[key] ?? [], now),
            },
          };
        }),
    }),
    {
      name: 'vecini.marketplace',
      version: 1,
      partialize: (s) => ({ byAsociatie: s.byAsociatie }),
      migrate: (persisted) => ({ byAsociatie: migrateMarketplaceState(persisted) }),
    },
  ),
);

/** Recent listing timestamps for one user (pruned to the sliding window). */
export function recentListingCount(
  postTimestamps: Record<string, number[]>,
  asociatieId: string,
  userId: string,
  now = Date.now(),
): number {
  const key = `${asociatieId}:${userId}`;
  return pruneTimestamps(postTimestamps[key] ?? [], now).length;
}

export function useAsociatieMarketplace(): MarketplaceListing[] {
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  return useMarketplaceStore((s) => marketplaceForAsociatie(s.byAsociatie, asociatieId));
}
