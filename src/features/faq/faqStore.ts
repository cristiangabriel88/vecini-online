import { create } from 'zustand';
import type { FaqEntry } from '@/shared/types/domain';
import { DEMO_FAQ } from '@/shared/demo/demoData';

interface FaqState {
  items: FaqEntry[];
  myVotes: Record<string, boolean>; // faqId -> helpful?
  vote: (id: string, helpful: boolean) => void;
}

export const useFaqStore = create<FaqState>((set, get) => ({
  items: [...DEMO_FAQ],
  myVotes: {},
  vote: (id, helpful) => {
    if (get().myVotes[id] !== undefined) return;
    set((s) => ({
      myVotes: { ...s.myVotes, [id]: helpful },
      items: s.items.map((e) =>
        e.id === id
          ? {
              ...e,
              helpful_count: e.helpful_count + (helpful ? 1 : 0),
              not_helpful_count: e.not_helpful_count + (helpful ? 0 : 1),
            }
          : e,
      ),
    }));
  },
}));
