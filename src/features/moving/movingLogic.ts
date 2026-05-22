import type { MovingBooking } from '@/shared/types/domain';

/** Bookable elevator blocks for a move (3-hour windows). */
export const MOVING_SLOTS = [
  '08:00–11:00',
  '11:00–14:00',
  '14:00–17:00',
  '17:00–20:00',
];

/** A move booking needs a date, a slot and a destination floor. */
export function isValidBooking(date: string, slot: string, floor: string): boolean {
  return date.trim().length > 0 && slot.trim().length > 0 && /^\d+$/.test(floor.trim());
}

/** Whether the elevator is already reserved for that date/slot. */
export function isSlotTaken(bookings: MovingBooking[], date: string, slot: string): boolean {
  return bookings.some((b) => b.date === date && b.slot === slot);
}

/** Bookings ordered by date then slot start. */
export function sortBookings(bookings: MovingBooking[]): MovingBooking[] {
  return [...bookings].sort((a, b) =>
    a.date === b.date ? a.slot.localeCompare(b.slot) : a.date.localeCompare(b.date),
  );
}

/** Only the given user's bookings. */
export function myBookings(bookings: MovingBooking[], userId: string): MovingBooking[] {
  return bookings.filter((b) => b.user_id === userId);
}
