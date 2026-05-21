import { describe, expect, it } from 'vitest';
import { isValidBike, searchBikes } from '@/features/bikes/bikeLogic';
import type { Bike } from '@/shared/types/domain';

const base = { asociatie_id: 'a', owner_user_id: 'u', photo_path: null };

const bikes: Bike[] = [
  { ...base, id: '1', owner_name: 'Andrei', description: 'Mountain bike negru Cube', serial: 'CB-2291', abandoned: false, created_at: '2026-04-20T09:00:00Z' },
  { ...base, id: '2', owner_name: 'Elena', description: 'Bicicletă de oraș albă', serial: null, abandoned: false, created_at: '2026-04-15T09:00:00Z' },
  { ...base, id: '3', owner_name: 'Necunoscut', description: 'Bicicletă copii ruginită', serial: null, abandoned: true, created_at: '2025-11-01T09:00:00Z' },
];

describe('isValidBike', () => {
  it('requires a short description', () => {
    expect(isValidBike('BMX')).toBe(true);
    expect(isValidBike('  ')).toBe(false);
    expect(isValidBike('ab')).toBe(false);
  });
});

describe('searchBikes', () => {
  it('returns all bikes newest-first by default', () => {
    expect(searchBikes(bikes, '').map((b) => b.id)).toEqual(['1', '2', '3']);
  });

  it('filters by abandoned state', () => {
    expect(searchBikes(bikes, '', 'active').map((b) => b.id)).toEqual(['1', '2']);
    expect(searchBikes(bikes, '', 'abandoned').map((b) => b.id)).toEqual(['3']);
  });

  it('matches description, serial or owner ignoring diacritics', () => {
    expect(searchBikes(bikes, 'cube').map((b) => b.id)).toEqual(['1']);
    expect(searchBikes(bikes, 'cb-2291').map((b) => b.id)).toEqual(['1']);
    expect(searchBikes(bikes, 'oras').map((b) => b.id)).toEqual(['2']);
  });
});
