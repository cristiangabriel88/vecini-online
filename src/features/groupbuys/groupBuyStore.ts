import { create } from 'zustand';
import type { GroupBuy } from '@/shared/types/domain';
import { DEMO_GROUP_BUYS } from '@/shared/demo/demoData';

const CURRENT_USER_ID = 'u-res';
const CURRENT_USER_NAME = 'Popescu Andrei';

interface NewGroupBuy {
  title: string;
  description: string;
  deadline: string;
}

interface GroupBuyState {
  buys: GroupBuy[];
  joined: string[];
  create: (input: NewGroupBuy) => void;
  /** Sign the current user up for a group buy (once). */
  join: (id: string) => void;
}

export const useGroupBuyStore = create<GroupBuyState>((set, get) => ({
  buys: [...DEMO_GROUP_BUYS],
  joined: [],
  create: ({ title, description, deadline }) =>
    set((s) => ({
      buys: [
        {
          id: `gb-${Date.now()}`,
          asociatie_id: 'demo-asoc',
          organizer_user_id: CURRENT_USER_ID,
          organizer_name: CURRENT_USER_NAME,
          title: title.trim(),
          description: description.trim(),
          deadline,
          created_at: new Date().toISOString(),
          signups: 0,
        },
        ...s.buys,
      ],
    })),
  join: (id) => {
    if (get().joined.includes(id)) return;
    set((s) => ({
      joined: [...s.joined, id],
      buys: s.buys.map((b) => (b.id === id ? { ...b, signups: b.signups + 1 } : b)),
    }));
  },
}));
