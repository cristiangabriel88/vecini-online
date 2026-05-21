import { create } from 'zustand';
import type { LendingItem } from '@/shared/types/domain';
import { DEMO_LENDING_ITEMS } from '@/shared/demo/demoData';

interface LendingState {
  items: LendingItem[];
  add: (input: { name: string; category: string }) => void;
  toggleAvailable: (id: string) => void;
}

export const useLendingStore = create<LendingState>((set) => ({
  items: [...DEMO_LENDING_ITEMS],
  add: ({ name, category }) =>
    set((s) => ({
      items: [
        {
          id: `li-${Date.now()}`,
          asociatie_id: 'demo-asoc',
          owner_user_id: 'u-res',
          owner_name: 'Popescu Andrei',
          name: name.trim(),
          category: category.trim(),
          photo_path: null,
          available: true,
          created_at: new Date().toISOString(),
        },
        ...s.items,
      ],
    })),
  toggleAvailable: (id) =>
    set((s) => ({
      items: s.items.map((it) => (it.id === id ? { ...it, available: !it.available } : it)),
    })),
}));
