import type { VenueBooking } from '@/shared/types/domain';

/** Bookable shared venues. */
export const VENUES = ['Sală comună', 'Terasă'];

/** Bookable blocks for a venue (4-hour windows). */
export const VENUE_SLOTS = ['10:00–14:00', '14:00–18:00', '18:00–22:00'];

/** A venue booking needs a venue, a date, a slot and a short purpose. */
export function isValidBooking(
  venue: string,
  date: string,
  slot: string,
  purpose: string,
): boolean {
  return (
    venue.trim().length > 0 &&
    date.trim().length > 0 &&
    slot.trim().length > 0 &&
    purpose.trim().length >= 3
  );
}

/** Whether that venue is already reserved for the date/slot (other venues are independent). */
export function isSlotTaken(
  bookings: VenueBooking[],
  venue: string,
  date: string,
  slot: string,
): boolean {
  return bookings.some((b) => b.venue === venue && b.date === date && b.slot === slot);
}

/** Bookings ordered by date, then slot start, then venue. */
export function sortBookings(bookings: VenueBooking[]): VenueBooking[] {
  return [...bookings].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    if (a.slot !== b.slot) return a.slot.localeCompare(b.slot);
    return a.venue.localeCompare(b.venue);
  });
}

/** Only the given user's bookings. */
export function myBookings(bookings: VenueBooking[], userId: string): VenueBooking[] {
  return bookings.filter((b) => b.user_id === userId);
}
