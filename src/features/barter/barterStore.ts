import { create } from 'zustand';
import type { SkillOffering } from '@/shared/types/domain';
import { DEMO_SKILLS } from '@/shared/demo/demoData';

const CURRENT_USER_ID = 'u-res';
const CURRENT_USER_NAME = 'Popescu Andrei';

interface BarterState {
  offerings: SkillOffering[];
  currentUserId: string;
  /** Create or update the current user's offering (opt-in). */
  save: (offers: string, needs: string) => void;
  /** Remove the current user's offering (opt-out). */
  leave: () => void;
}

export const useBarterStore = create<BarterState>((set) => ({
  offerings: [...DEMO_SKILLS],
  currentUserId: CURRENT_USER_ID,
  save: (offers, needs) =>
    set((s) => {
      const existing = s.offerings.find((o) => o.user_id === CURRENT_USER_ID);
      if (existing) {
        return {
          offerings: s.offerings.map((o) =>
            o.user_id === CURRENT_USER_ID ? { ...o, offers: offers.trim(), needs: needs.trim() } : o,
          ),
        };
      }
      return {
        offerings: [
          {
            id: `sk-${Date.now()}`,
            asociatie_id: 'demo-asoc',
            user_id: CURRENT_USER_ID,
            user_name: CURRENT_USER_NAME,
            offers: offers.trim(),
            needs: needs.trim(),
          },
          ...s.offerings,
        ],
      };
    }),
  leave: () => set((s) => ({ offerings: s.offerings.filter((o) => o.user_id !== CURRENT_USER_ID) })),
}));
