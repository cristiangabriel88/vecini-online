import { describe, expect, it } from 'vitest';
import { isValidOffering, searchOfferings } from '@/features/barter/barterLogic';
import type { SkillOffering } from '@/shared/types/domain';

const base = { asociatie_id: 'a' };
const offerings: SkillOffering[] = [
  { ...base, id: '1', user_id: 'u1', user_name: 'Georgescu Elena', offers: 'Reparații biciclete', needs: 'Ajutor cu Excel' },
  { ...base, id: '2', user_id: 'u2', user_name: 'Stan Gabriela', offers: 'Croitorie', needs: 'Transport la piață' },
  { ...base, id: '3', user_id: 'u3', user_name: 'Anton Maria', offers: 'Lecții de pian', needs: '' },
];

describe('isValidOffering', () => {
  it('requires a short offers description', () => {
    expect(isValidOffering('Croitorie')).toBe(true);
    expect(isValidOffering('ab')).toBe(false);
  });
});

describe('searchOfferings', () => {
  it('sorts by name', () => {
    expect(searchOfferings(offerings).map((o) => o.id)).toEqual(['3', '1', '2']);
  });

  it('matches free text over name/offers/needs ignoring diacritics', () => {
    expect(searchOfferings(offerings, 'biciclete').map((o) => o.id)).toEqual(['1']);
    expect(searchOfferings(offerings, 'piata').map((o) => o.id)).toEqual(['2']);
    expect(searchOfferings(offerings, 'pian').map((o) => o.id)).toEqual(['3']);
  });
});
