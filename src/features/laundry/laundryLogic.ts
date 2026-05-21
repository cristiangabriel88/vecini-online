import type { LaundryBooking } from '@/shared/types/domain';

/** Bookable two-hour slots in a laundry day. */
export const LAUNDRY_SLOTS = [
  '08:00–10:00',
  '10:00–12:00',
  '12:00–14:00',
  '16:00–18:00',
  '18:00–20:00',
];

/** A booking needs a resource, a date and a slot. */
export function isValidBooking(resource: string, date: string, slot: string): boolean {
  return resource.trim().length > 0 && date.trim().length > 0 && slot.trim().length > 0;
}

/** Whether the given resource/date/slot is already reserved. */
export function isSlotTaken(
  bookings: LaundryBooking[],
  resource: string,
  date: string,
  slot: string,
): boolean {
  return bookings.some((b) => b.resource === resource && b.date === date && b.slot === slot);
}

/** Bookings ordered by date then slot start. */
export function sortBookings(bookings: LaundryBooking[]): LaundryBooking[] {
  return [...bookings].sort((a, b) =>
    a.date === b.date ? a.slot.localeCompare(b.slot) : a.date.localeCompare(b.date),
  );
}

/** Only the given user's bookings. */
export function myBookings(bookings: LaundryBooking[], userId: string): LaundryBooking[] {
  return bookings.filter((b) => b.user_id === userId);
}
