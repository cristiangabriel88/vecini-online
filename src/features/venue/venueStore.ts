import { create } from 'zustand';
import type { VenueBooking } from '@/shared/types/domain';
import { DEMO_VENUE_BOOKINGS } from '@/shared/demo/demoData';

/** Demo identity of the signed-in resident. */
export const DEMO_USER = { id: 'u-res', name: 'Popescu Andrei' };

interface VenueState {
  bookings: VenueBooking[];
  book: (venue: string, date: string, slot: string, purpose: string) => void;
  cancel: (id: string) => void;
}

export const useVenueStore = create<VenueState>((set) => ({
  bookings: [...DEMO_VENUE_BOOKINGS],
  book: (venue, date, slot, purpose) =>
    set((s) => ({
      bookings: [
        ...s.bookings,
        {
          id: `vn-${Date.now()}`,
          asociatie_id: 'demo-asoc',
          venue,
          date,
          slot,
          purpose,
          user_id: DEMO_USER.id,
          user_name: DEMO_USER.name,
        },
      ],
    })),
  cancel: (id) => set((s) => ({ bookings: s.bookings.filter((b) => b.id !== id) })),
}));
