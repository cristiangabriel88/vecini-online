import { create } from 'zustand';
import type { LaundryBooking } from '@/shared/types/domain';
import { DEMO_LAUNDRY_BOOKINGS, DEMO_LAUNDRY_RESOURCES } from '@/shared/demo/demoData';

/** Demo identity of the signed-in resident. */
export const DEMO_USER = { id: 'u-res', name: 'Popescu Andrei' };

export const LAUNDRY_RESOURCES = DEMO_LAUNDRY_RESOURCES;

interface LaundryState {
  bookings: LaundryBooking[];
  book: (resource: string, date: string, slot: string) => void;
  cancel: (id: string) => void;
}

export const useLaundryStore = create<LaundryState>((set) => ({
  bookings: [...DEMO_LAUNDRY_BOOKINGS],
  book: (resource, date, slot) =>
    set((s) => ({
      bookings: [
        ...s.bookings,
        {
          id: `lb-${Date.now()}`,
          asociatie_id: 'demo-asoc',
          resource,
          date,
          slot,
          user_id: DEMO_USER.id,
          user_name: DEMO_USER.name,
        },
      ],
    })),
  cancel: (id) => set((s) => ({ bookings: s.bookings.filter((b) => b.id !== id) })),
}));
