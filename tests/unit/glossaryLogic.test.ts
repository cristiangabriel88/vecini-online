import { describe, expect, it } from 'vitest';
import { searchGlossary, findTerm } from '@/features/glossary/glossaryLogic';
import type { GlossaryEntry } from '@/shared/types/domain';

const entries: GlossaryEntry[] = [
  { id: '1', asociatie_id: 'a', term: 'Fond de rulment', definition: 'Sumă de garanție.' },
  { id: '2', asociatie_id: 'a', term: 'Cotă-parte indiviză', definition: 'Procent din proprietatea comună.' },
  { id: '3', asociatie_id: 'a', term: 'Cenzor', definition: 'Verifică gestiunea financiară.' },
];

describe('searchGlossary', () => {
  it('returns all entries sorted alphabetically when query is empty', () => {
    expect(searchGlossary(entries, '').map((e) => e.id)).toEqual(['3', '2', '1']);
  });

  it('matches term or definition, ignoring diacritics', () => {
    expect(searchGlossary(entries, 'indiviza').map((e) => e.id)).toEqual(['2']);
    expect(searchGlossary(entries, 'garantie').map((e) => e.id)).toEqual(['1']);
    expect(searchGlossary(entries, 'xyz')).toHaveLength(0);
  });
});

describe('findTerm', () => {
  it('finds a term by exact normalised name', () => {
    expect(findTerm(entries, 'CENZOR')?.id).toBe('3');
    expect(findTerm(entries, 'cotă-parte indiviză')?.id).toBe('2');
    expect(findTerm(entries, 'lipsă')).toBeUndefined();
  });
});
