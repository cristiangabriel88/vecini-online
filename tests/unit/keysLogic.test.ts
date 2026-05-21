import { describe, expect, it } from 'vitest';
import { isValidHandover, isValidKey, searchKeys, sortKeys } from '@/features/keys/keysLogic';
import type { KeyRecord } from '@/shared/types/domain';

const keys: KeyRecord[] = [
  { id: '1', asociatie_id: 'a', space: 'Terasă', holder_name: 'Popescu Andrei', notes: 'copie la președinte' },
  { id: '2', asociatie_id: 'a', space: 'Centrală termică', holder_name: 'Ionescu Mihai', notes: null },
];

describe('validation', () => {
  it('validates key records and handovers', () => {
    expect(isValidKey('Terasă', 'Andrei')).toBe(true);
    expect(isValidKey('', 'Andrei')).toBe(false);
    expect(isValidKey('Terasă', ' ')).toBe(false);
    expect(isValidHandover('Maria')).toBe(true);
    expect(isValidHandover('  ')).toBe(false);
  });
});

describe('searchKeys', () => {
  it('matches space, holder and notes, ignoring diacritics', () => {
    expect(searchKeys(keys, 'centrala').map((k) => k.id)).toEqual(['2']);
    expect(searchKeys(keys, 'andrei').map((k) => k.id)).toEqual(['1']);
    expect(searchKeys(keys, 'presedinte').map((k) => k.id)).toEqual(['1']);
    expect(searchKeys(keys, '').length).toBe(2);
  });
});

describe('sortKeys', () => {
  it('orders alphabetically by space', () => {
    expect(sortKeys(keys).map((k) => k.id)).toEqual(['2', '1']);
  });
});
