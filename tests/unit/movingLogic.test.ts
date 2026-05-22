import { describe, expect, it } from 'vitest';
import {
  isSlotTaken,
  isValidBooking,
  myBookings,
  sortBookings,
} from '@/features/moving/movingLogic';
import type { MovingBooking } from '@/shared/types/domain';

const bk = (id: string, date: string, slot: string, floor: string, user: string): MovingBooking => ({
  id,
  asociatie_id: 'a',
  date,
  slot,
  floor,
  user_id: user,
  user_name: user,
});

const bookings: MovingBooking[] = [
  bk('1', '2026-05-22', '11:00–14:00', '4', 'u1'),
  bk('2', '2026-05-20', '08:00–11:00', '7', 'u-res'),
  bk('3', '2026-05-20', '17:00–20:00', '2', 'u-res'),
];

describe('isValidBooking', () => {
  it('requires a date, a slot and a numeric floor', () => {
    expect(isValidBooking('2026-05-22', '08:00–11:00', '4')).toBe(true);
    expect(isValidBooking('', '08:00–11:00', '4')).toBe(false);
    expect(isValidBooking('2026-05-22', '', '4')).toBe(false);
    expect(isValidBooking('2026-05-22', '08:00–11:00', '')).toBe(false);
    expect(isValidBooking('2026-05-22', '08:00–11:00', 'parter')).toBe(false);
  });
});

describe('isSlotTaken', () => {
  it('detects an exact date/slot clash regardless of floor', () => {
    expect(isSlotTaken(bookings, '2026-05-22', '11:00–14:00')).toBe(true);
    expect(isSlotTaken(bookings, '2026-05-22', '08:00–11:00')).toBe(false);
    expect(isSlotTaken(bookings, '2026-05-21', '11:00–14:00')).toBe(false);
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
