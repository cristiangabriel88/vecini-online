import { describe, expect, it } from 'vitest';
import {
  isSlotTaken,
  isValidBooking,
  myBookings,
  sortBookings,
} from '@/features/venue/venueLogic';
import type { VenueBooking } from '@/shared/types/domain';

const bk = (
  id: string,
  venue: string,
  date: string,
  slot: string,
  user: string,
): VenueBooking => ({
  id,
  asociatie_id: 'a',
  venue,
  date,
  slot,
  purpose: 'Petrecere',
  user_id: user,
  user_name: user,
});

const bookings: VenueBooking[] = [
  bk('1', 'Sală comună', '2026-05-22', '14:00–18:00', 'u1'),
  bk('2', 'Terasă', '2026-05-20', '10:00–14:00', 'u-res'),
  bk('3', 'Sală comună', '2026-05-20', '18:00–22:00', 'u-res'),
];

describe('isValidBooking', () => {
  it('requires a venue, a date, a slot and a 3+ char purpose', () => {
    expect(isValidBooking('Terasă', '2026-05-22', '10:00–14:00', 'Aniversare')).toBe(true);
    expect(isValidBooking('', '2026-05-22', '10:00–14:00', 'Aniversare')).toBe(false);
    expect(isValidBooking('Terasă', '', '10:00–14:00', 'Aniversare')).toBe(false);
    expect(isValidBooking('Terasă', '2026-05-22', '', 'Aniversare')).toBe(false);
    expect(isValidBooking('Terasă', '2026-05-22', '10:00–14:00', 'ab')).toBe(false);
  });
});

describe('isSlotTaken', () => {
  it('detects a clash only for the same venue/date/slot', () => {
    expect(isSlotTaken(bookings, 'Sală comună', '2026-05-22', '14:00–18:00')).toBe(true);
    // same date/slot but a different venue is free
    expect(isSlotTaken(bookings, 'Terasă', '2026-05-22', '14:00–18:00')).toBe(false);
    expect(isSlotTaken(bookings, 'Sală comună', '2026-05-22', '10:00–14:00')).toBe(false);
  });
});

describe('sortBookings', () => {
  it('orders by date, then slot, then venue', () => {
    expect(sortBookings(bookings).map((b) => b.id)).toEqual(['2', '3', '1']);
  });
});

describe('myBookings', () => {
  it('returns only the given user bookings', () => {
    expect(myBookings(bookings, 'u-res').map((b) => b.id)).toEqual(['2', '3']);
  });
});
