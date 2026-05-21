import { describe, expect, it } from 'vitest';
import { isValidSitter, searchSitters } from '@/features/sitters/sitterLogic';
import type { SitterProfile } from '@/shared/types/domain';

const base = { asociatie_id: 'a' };
const profiles: SitterProfile[] = [
  { ...base, id: '1', user_id: 'u1', user_name: 'Georgescu Elena', kind: 'babysitting', availability: 'Seri în weekend', rate: '40 lei/oră' },
  { ...base, id: '2', user_id: 'u2', user_name: 'Stan Gabriela', kind: 'petsitting', availability: 'Flexibil', rate: 'Negociabil' },
  { ...base, id: '3', user_id: 'u3', user_name: 'Anton Maria', kind: 'babysitting', availability: 'După-amiaza', rate: '35 lei/oră' },
];

describe('isValidSitter', () => {
  it('requires a short availability note', () => {
    expect(isValidSitter('Seri')).toBe(true);
    expect(isValidSitter(' a')).toBe(false);
  });
});

describe('searchSitters', () => {
  it('sorts by name', () => {
    expect(searchSitters(profiles).map((p) => p.id)).toEqual(['3', '1', '2']);
  });

  it('filters by kind', () => {
    expect(searchSitters(profiles, 'petsitting').map((p) => p.id)).toEqual(['2']);
  });

  it('matches free text ignoring diacritics', () => {
    expect(searchSitters(profiles, 'all', 'weekend').map((p) => p.id)).toEqual(['1']);
    expect(searchSitters(profiles, 'all', 'gabriela').map((p) => p.id)).toEqual(['2']);
  });
});
