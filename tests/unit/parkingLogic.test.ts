import { describe, expect, it } from 'vitest';
import { countFree, isOccupied, isValidSpot, searchSpots, sortSpots } from '@/features/parking/parkingLogic';
import type { ParkingSpot } from '@/shared/types/domain';

const spots: ParkingSpot[] = [
  { id: '1', asociatie_id: 'a', label: 'P10', zone: 'Față', is_visitor: false, apartment_label: 'Ap. 5', license_plate: 'B 12 ABC' },
  { id: '2', asociatie_id: 'a', label: 'P2', zone: 'Spate', is_visitor: false, apartment_label: null, license_plate: null },
  { id: '3', asociatie_id: 'a', label: 'V1', zone: 'Vizitatori', is_visitor: true, apartment_label: null, license_plate: null },
];

describe('isOccupied / isValidSpot', () => {
  it('detects assignment and validates label', () => {
    expect(isOccupied(spots[0])).toBe(true);
    expect(isOccupied(spots[1])).toBe(false);
    expect(isValidSpot('P5')).toBe(true);
    expect(isValidSpot('  ')).toBe(false);
  });
});

describe('searchSpots', () => {
  it('matches label, plate and apartment, ignoring diacritics', () => {
    expect(searchSpots(spots, 'abc').map((s) => s.id)).toEqual(['1']);
    expect(searchSpots(spots, 'fata').map((s) => s.id)).toEqual(['1']);
    expect(searchSpots(spots, 'ap. 5').map((s) => s.id)).toEqual(['1']);
    expect(searchSpots(spots, '').length).toBe(3);
  });
});

describe('sortSpots / countFree', () => {
  it('sorts numerically and counts free resident spots', () => {
    expect(sortSpots(spots).map((s) => s.label)).toEqual(['P2', 'P10', 'V1']);
    expect(countFree(spots)).toBe(1);
  });
});
