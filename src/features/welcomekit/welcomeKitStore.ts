import { create } from 'zustand';
import type { WelcomeKitItem } from '@/shared/types/domain';
import { DEMO_WELCOME_KIT } from '@/shared/demo/demoData';
import { nextOrder } from './welcomeKitLogic';

interface WelcomeKitState {
  items: WelcomeKitItem[];
  /** Step ids the current resident has marked as done. */
  doneIds: Set<string>;
  addItem: (title: string, body: string) => void;
  removeItem: (id: string) => void;
  toggleDone: (id: string) => void;
}

export const useWelcomeKitStore = create<WelcomeKitState>((set) => ({
  items: [...DEMO_WELCOME_KIT],
  doneIds: new Set<string>(),
  addItem: (title, body) =>
    set((s) => ({
      items: [
        ...s.items,
        {
          id: `wk-${Date.now()}`,
          asociatie_id: 'demo-asoc',
          order: nextOrder(s.items),
          title,
          body,
        },
      ],
    })),
  removeItem: (id) =>
    set((s) => {
      const doneIds = new Set(s.doneIds);
      doneIds.delete(id);
      return { items: s.items.filter((i) => i.id !== id), doneIds };
    }),
  toggleDone: (id) =>
    set((s) => {
      const doneIds = new Set(s.doneIds);
      if (doneIds.has(id)) doneIds.delete(id);
      else doneIds.add(id);
      return { doneIds };
    }),
}));
