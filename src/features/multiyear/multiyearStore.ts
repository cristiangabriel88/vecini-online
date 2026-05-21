import { create } from 'zustand';
import type { MultiyearPlanItem } from '@/shared/types/domain';
import { DEMO_MULTIYEAR } from '@/shared/demo/demoData';

interface NewItem {
  year: number;
  title: string;
  estimated_cost: number;
  notes: string;
}

interface MultiyearState {
  items: MultiyearPlanItem[];
  add: (input: NewItem) => void;
}

export const useMultiyearStore = create<MultiyearState>((set) => ({
  items: [...DEMO_MULTIYEAR],
  add: ({ year, title, estimated_cost, notes }) =>
    set((s) => ({
      items: [
        {
          id: `mp-${Date.now()}`,
          asociatie_id: 'demo-asoc',
          year,
          title: title.trim(),
          estimated_cost,
          notes: notes.trim() || null,
        },
        ...s.items,
      ],
    })),
}));
