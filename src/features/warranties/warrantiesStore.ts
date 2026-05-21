import { create } from 'zustand';
import type { Warranty } from '@/shared/types/domain';
import { DEMO_WARRANTIES } from '@/shared/demo/demoData';
import { computeExpiry } from './warrantyLogic';

interface WarrantiesState {
  warranties: Warranty[];
  add: (input: { asset: string; purchasedAt: string; months: number }) => void;
}

export const useWarrantiesStore = create<WarrantiesState>((set) => ({
  warranties: [...DEMO_WARRANTIES],
  add: ({ asset, purchasedAt, months }) =>
    set((s) => ({
      warranties: [
        {
          id: `wr-${Date.now()}`,
          asociatie_id: 'demo-asoc',
          asset: asset.trim(),
          purchased_at: purchasedAt,
          warranty_months: months,
          expires_at: computeExpiry(purchasedAt, months),
          document_path: null,
        },
        ...s.warranties,
      ],
    })),
}));
