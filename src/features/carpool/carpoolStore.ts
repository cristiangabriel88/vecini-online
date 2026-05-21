import { create } from 'zustand';
import type { CarpoolProfile } from '@/shared/types/domain';
import { DEMO_CARPOOL } from '@/shared/demo/demoData';

const CURRENT_USER_ID = 'u-res';
const CURRENT_USER_NAME = 'Popescu Andrei';

interface CarpoolState {
  profiles: CarpoolProfile[];
  currentUserId: string;
  /** Create or update the current user's profile (opt-in). */
  save: (destination: string, schedule: string) => void;
  /** Remove the current user's profile (opt-out). */
  leave: () => void;
}

export const useCarpoolStore = create<CarpoolState>((set) => ({
  profiles: [...DEMO_CARPOOL],
  currentUserId: CURRENT_USER_ID,
  save: (destination, schedule) =>
    set((s) => {
      const existing = s.profiles.find((p) => p.user_id === CURRENT_USER_ID);
      if (existing) {
        return {
          profiles: s.profiles.map((p) =>
            p.user_id === CURRENT_USER_ID
              ? { ...p, destination: destination.trim(), schedule: schedule.trim() }
              : p,
          ),
        };
      }
      return {
        profiles: [
          {
            id: `cp-${Date.now()}`,
            asociatie_id: 'demo-asoc',
            user_id: CURRENT_USER_ID,
            user_name: CURRENT_USER_NAME,
            destination: destination.trim(),
            schedule: schedule.trim(),
          },
          ...s.profiles,
        ],
      };
    }),
  leave: () =>
    set((s) => ({ profiles: s.profiles.filter((p) => p.user_id !== CURRENT_USER_ID) })),
}));
