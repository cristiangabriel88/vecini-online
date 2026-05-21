import { create } from 'zustand';
import type { MarketplaceListing } from '@/shared/types/domain';
import { DEMO_MARKETPLACE } from '@/shared/demo/demoData';
import { expiryFrom } from './marketplaceLogic';

interface NewListing {
  title: string;
  description: string;
  category: string;
  price: number | null;
}

interface MarketplaceState {
  listings: MarketplaceListing[];
  add: (input: NewListing) => void;
}

export const useMarketplaceStore = create<MarketplaceState>((set) => ({
  listings: [...DEMO_MARKETPLACE],
  add: ({ title, description, category, price }) =>
    set((s) => {
      const now = new Date().toISOString();
      return {
        listings: [
          {
            id: `ml-${Date.now()}`,
            asociatie_id: 'demo-asoc',
            seller_user_id: 'u-res',
            seller_name: 'Popescu Andrei',
            category,
            title: title.trim(),
            description: description.trim(),
            price,
            photo_path: null,
            expires_at: expiryFrom(now),
            created_at: now,
          },
          ...s.listings,
        ],
      };
    }),
}));
