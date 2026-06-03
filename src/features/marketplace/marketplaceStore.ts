import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MarketplaceListing } from '@/shared/types/domain';
import { useAuthStore } from '@/shared/store/authStore';
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
  addListing: (asociatieId: string, item: MarketplaceListing) => void;
  replaceForAsociatie: (asociatieId: string, items: MarketplaceListing[]) => void;
  setFetchError: (msg: string | null) => void;
}

export const useMarketplaceStore = create<MarketplaceState>()(
  persist(
    (set) => ({
      byAsociatie: seedMarketplace(),
      fetchError: null,

      addListing: (asociatieId, item) =>
        set((s) => ({ byAsociatie: addListingIn(s.byAsociatie, asociatieId, item) })),

      replaceForAsociatie: (asociatieId, items) =>
        set((s) => ({ byAsociatie: { ...s.byAsociatie, [asociatieId]: items } })),

      setFetchError: (msg) => set({ fetchError: msg }),
    }),
    {
      name: 'vecini.marketplace',
      version: 1,
      partialize: (s) => ({ byAsociatie: s.byAsociatie }),
      migrate: (persisted) => ({ byAsociatie: migrateMarketplaceState(persisted) }),
    },
  ),
);

export function useAsociatieMarketplace(): MarketplaceListing[] {
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  return useMarketplaceStore((s) => marketplaceForAsociatie(s.byAsociatie, asociatieId));
}
