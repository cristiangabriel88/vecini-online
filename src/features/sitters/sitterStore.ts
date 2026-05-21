import { create } from 'zustand';
import type { SitterProfile } from '@/shared/types/domain';
import { DEMO_SITTERS } from '@/shared/demo/demoData';

const CURRENT_USER_ID = 'u-res';
const CURRENT_USER_NAME = 'Popescu Andrei';

interface SitterState {
  profiles: SitterProfile[];
  currentUserId: string;
  /** Create or update the current user's sitter profile (opt-in). */
  save: (kind: string, availability: string, rate: string) => void;
  /** Remove the current user's profile (opt-out). */
  leave: () => void;
}

export const useSitterStore = create<SitterState>((set) => ({
  profiles: [...DEMO_SITTERS],
  currentUserId: CURRENT_USER_ID,
  save: (kind, availability, rate) =>
    set((s) => {
      const existing = s.profiles.find((p) => p.user_id === CURRENT_USER_ID);
      if (existing) {
        return {
          profiles: s.profiles.map((p) =>
            p.user_id === CURRENT_USER_ID
              ? { ...p, kind, availability: availability.trim(), rate: rate.trim() }
              : p,
          ),
        };
      }
      return {
        profiles: [
          {
            id: `st-${Date.now()}`,
            asociatie_id: 'demo-asoc',
            user_id: CURRENT_USER_ID,
            user_name: CURRENT_USER_NAME,
            kind,
            availability: availability.trim(),
            rate: rate.trim(),
          },
          ...s.profiles,
        ],
      };
    }),
  leave: () => set((s) => ({ profiles: s.profiles.filter((p) => p.user_id !== CURRENT_USER_ID) })),
}));
