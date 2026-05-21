import { describe, expect, it } from 'vitest';
import {
  isSlotTaken,
  isValidBooking,
  myBookings,
  sortBookings,
} from '@/features/laundry/laundryLogic';
import type { LaundryBooking } from '@/shared/types/domain';

const bk = (id: string, resource: string, date: string, slot: string, user: string): LaundryBooking => ({
  id,
  asociatie_id: 'a',
  resource,
  date,
  slot,
  user_id: user,
  user_name: user,
});

const bookings: LaundryBooking[] = [
  bk('1', 'Mașină 1', '2026-05-22', '10:00–12:00', 'u1'),
  bk('2', 'Mașină 1', '2026-05-20', '08:00–10:00', 'u-res'),
  bk('3', 'Mașină 2', '2026-05-20', '18:00–20:00', 'u-res'),
];

describe('isValidBooking', () => {
  it('requires all three fields', () => {
    expect(isValidBooking('Mașină 1', '2026-05-22', '10:00–12:00')).toBe(true);
    expect(isValidBooking('', '2026-05-22', '10:00–12:00')).toBe(false);
    expect(isValidBooking('Mașină 1', '', '10:00–12:00')).toBe(false);
  });
});

describe('isSlotTaken', () => {
  it('detects an exact resource/date/slot clash', () => {
    expect(isSlotTaken(bookings, 'Mașină 1', '2026-05-22', '10:00–12:00')).toBe(true);
    expect(isSlotTaken(bookings, 'Mașină 1', '2026-05-22', '08:00–10:00')).toBe(false);
    expect(isSlotTaken(bookings, 'Mașină 2', '2026-05-22', '10:00–12:00')).toBe(false);
  });
});

describe('sortBookings', () => {
  it('orders by date then slot', () => {
    expect(sortBookings(bookings).map((b) => b.id)).toEqual(['2', '3', '1']);
  });
});

describe('myBookings', () => {
  it('returns only the given user bookings', () => {
    expect(myBookings(bookings, 'u-res').map((b) => b.id)).toEqual(['2', '3']);
  });
});
