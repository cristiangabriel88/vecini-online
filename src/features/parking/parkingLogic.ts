import type { ParkingSpot } from '@/shared/types/domain';
import { normalizeSearch } from '@/features/faq/faqLogic';

/** A spot is occupied when an apartment is assigned to it. */
export function isOccupied(spot: ParkingSpot): boolean {
  return spot.apartment_label !== null && spot.apartment_label.trim().length > 0;
}

/** A new spot needs a non-empty label. */
export function isValidSpot(label: string): boolean {
  return label.trim().length > 0;
}

/** Search by spot label, zone, apartment or licence plate (accent-insensitive). */
export function searchSpots(spots: ParkingSpot[], query: string): ParkingSpot[] {
  const q = normalizeSearch(query.trim());
  if (!q) return spots;
  return spots.filter((s) =>
    normalizeSearch(
      `${s.label} ${s.zone ?? ''} ${s.apartment_label ?? ''} ${s.license_plate ?? ''}`,
    ).includes(q),
  );
}

/** Sort spots alphanumerically by label. */
export function sortSpots(spots: ParkingSpot[]): ParkingSpot[] {
  return [...spots].sort((a, b) =>
    a.label.localeCompare(b.label, 'ro', { numeric: true }),
  );
}

/** Count free (unassigned, non-visitor) spots. */
export function countFree(spots: ParkingSpot[]): number {
  return spots.filter((s) => !s.is_visitor && !isOccupied(s)).length;
}
