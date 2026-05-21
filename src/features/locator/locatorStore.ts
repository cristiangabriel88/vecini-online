import { create } from 'zustand';
import type { ResidentPost, ResidentPostCategory } from '@/shared/types/domain';
import { DEMO_RESIDENT_POSTS } from '@/shared/demo/demoData';
import { expiresAt } from './locatorLogic';

interface LocatorState {
  items: ResidentPost[];
  add: (input: { title: string; body: string; category: ResidentPostCategory }) => void;
  remove: (id: string) => void;
}

export const useLocatorStore = create<LocatorState>((set) => ({
  items: [...DEMO_RESIDENT_POSTS],
  add: ({ title, body, category }) =>
    set((s) => ({
      items: [
        {
          id: `rp-${Date.now()}`,
          asociatie_id: 'demo-asoc',
          author_user_id: 'u-res',
          author_name: 'Popescu Andrei',
          category,
          title,
          body,
          photo_path: null,
          expires_at: expiresAt().toISOString(),
          created_at: new Date().toISOString(),
        },
        ...s.items,
      ],
    })),
  remove: (id) => set((s) => ({ items: s.items.filter((p) => p.id !== id) })),
}));
