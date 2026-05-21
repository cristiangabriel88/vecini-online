import { describe, expect, it } from 'vitest';
import { isValidItem, searchLendingItems } from '@/features/lending/lendingLogic';
import type { LendingItem } from '@/shared/types/domain';

const base = {
  asociatie_id: 'a',
  owner_user_id: 'u',
  owner_name: 'Andrei',
  photo_path: null,
};

const items: LendingItem[] = [
  { ...base, id: '1', name: 'Bormașină Bosch', category: 'unelte', available: true, created_at: '2026-05-12T09:00:00Z' },
  { ...base, id: '2', name: 'Scară aluminiu', category: 'unelte', available: false, created_at: '2026-05-08T09:00:00Z' },
  { ...base, id: '3', name: 'Cabluri pornire', category: 'auto', available: true, created_at: '2026-05-04T09:00:00Z' },
];

describe('isValidItem', () => {
  it('requires a name and a category', () => {
    expect(isValidItem('Scară', 'unelte')).toBe(true);
    expect(isValidItem(' ', 'unelte')).toBe(false);
    expect(isValidItem('Scară', '')).toBe(false);
    expect(isValidItem('a', 'unelte')).toBe(false);
  });
});

describe('searchLendingItems', () => {
  it('returns all items newest-first by default', () => {
    expect(searchLendingItems(items, '').map((i) => i.id)).toEqual(['1', '2', '3']);
  });

  it('filters to available only', () => {
    expect(searchLendingItems(items, '', 'available').map((i) => i.id)).toEqual(['1', '3']);
  });

  it('matches name or category, ignoring diacritics', () => {
    expect(searchLendingItems(items, 'bormasina').map((i) => i.id)).toEqual(['1']);
    expect(searchLendingItems(items, 'auto').map((i) => i.id)).toEqual(['3']);
  });
});
