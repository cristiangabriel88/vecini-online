import { create } from 'zustand';
import type { MovingBooking } from '@/shared/types/domain';
import { DEMO_MOVING_BOOKINGS } from '@/shared/demo/demoData';

/** Demo identity of the signed-in resident. */
export const DEMO_USER = { id: 'u-res', name: 'Popescu Andrei' };

interface MovingState {
  bookings: MovingBooking[];
  book: (date: string, slot: string, floor: string) => void;
  cancel: (id: string) => void;
}

export const useMovingStore = create<MovingState>((set) => ({
  bookings: [...DEMO_MOVING_BOOKINGS],
  book: (date, slot, floor) =>
    set((s) => ({
      bookings: [
        ...s.bookings,
        {
          id: `mv-${Date.now()}`,
          asociatie_id: 'demo-asoc',
          date,
          slot,
          floor,
          user_id: DEMO_USER.id,
          user_name: DEMO_USER.name,
        },
      ],
    })),
  cancel: (id) => set((s) => ({ bookings: s.bookings.filter((b) => b.id !== id) })),
}));
