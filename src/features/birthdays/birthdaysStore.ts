import { create } from 'zustand';
import type { BirthdayConsent } from '@/shared/types/domain';
import { DEMO_BIRTHDAYS } from '@/shared/demo/demoData';

const CURRENT_USER_ID = 'u-res';
const CURRENT_USER_NAME = 'Popescu Andrei';

interface BirthdaysState {
  consents: BirthdayConsent[];
  currentUserId: string;
  /** Create or update the current user's birthday consent (opt-in). */
  save: (day: number, month: number) => void;
  /** Remove the current user's birthday consent (opt-out). */
  leave: () => void;
}

export const useBirthdaysStore = create<BirthdaysState>((set) => ({
  consents: [...DEMO_BIRTHDAYS],
  currentUserId: CURRENT_USER_ID,
  save: (day, month) =>
    set((s) => {
      const existing = s.consents.find((c) => c.user_id === CURRENT_USER_ID);
      if (existing) {
        return {
          consents: s.consents.map((c) =>
            c.user_id === CURRENT_USER_ID ? { ...c, birth_day: day, birth_month: month } : c,
          ),
        };
      }
      return {
        consents: [
          {
            id: `bd-${Date.now()}`,
            asociatie_id: 'demo-asoc',
            user_id: CURRENT_USER_ID,
            user_name: CURRENT_USER_NAME,
            birth_day: day,
            birth_month: month,
          },
          ...s.consents,
        ],
      };
    }),
  leave: () => set((s) => ({ consents: s.consents.filter((c) => c.user_id !== CURRENT_USER_ID) })),
}));
