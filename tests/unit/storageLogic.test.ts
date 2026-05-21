import { describe, expect, it } from 'vitest';
import { isValidStorageUnit, searchStorageUnits } from '@/features/storage/storageLogic';
import type { StorageUnit } from '@/shared/types/domain';

const base = { asociatie_id: 'a' };

const units: StorageUnit[] = [
  { ...base, id: '1', label: 'Boxa 2 — subsol', apartment_id: 'ap-5', apartment_label: 'Ap. 5', notes: null },
  { ...base, id: '2', label: 'Boxa 1 — subsol', apartment_id: 'ap-1', apartment_label: 'Ap. 1', notes: 'lângă centrală' },
  { ...base, id: '3', label: 'Dependință pod', apartment_id: null, apartment_label: null, notes: 'neatribuită' },
];

describe('isValidStorageUnit', () => {
  it('requires a short label', () => {
    expect(isValidStorageUnit('B1')).toBe(true);
    expect(isValidStorageUnit(' ')).toBe(false);
    expect(isValidStorageUnit('a')).toBe(false);
  });
});

describe('searchStorageUnits', () => {
  it('sorts assigned units first, then by label', () => {
    expect(searchStorageUnits(units).map((u) => u.id)).toEqual(['2', '1', '3']);
  });

  it('filters by assignment state', () => {
    expect(searchStorageUnits(units, '', 'unassigned').map((u) => u.id)).toEqual(['3']);
    expect(searchStorageUnits(units, '', 'assigned').map((u) => u.id)).toEqual(['2', '1']);
  });

  it('matches label, apartment or notes ignoring diacritics', () => {
    expect(searchStorageUnits(units, 'dependinta').map((u) => u.id)).toEqual(['3']);
    expect(searchStorageUnits(units, 'ap. 5').map((u) => u.id)).toEqual(['1']);
  });
});
