import { describe, expect, it } from 'vitest';
import { isValidPv, pvCategories, searchPv, sortPv } from '@/features/pv/pvLogic';
import type { PvDocument } from '@/shared/types/domain';

const base = { asociatie_id: 'a', storage_path: null, created_at: '2026-01-01T00:00:00Z' };

const docs: PvDocument[] = [
  { ...base, id: '1', title: 'PV AGA 2026', doc_date: '2026-03-10', category: 'AGA', content_text: 'aprobat bugetul' },
  { ...base, id: '2', title: 'PV comitet', doc_date: '2026-01-15', category: 'Comitet', content_text: 'salubritate' },
  { ...base, id: '3', title: 'Recepție acoperiș', doc_date: '2026-05-01', category: 'Recepție', content_text: 'fără obiecțiuni' },
];

describe('isValidPv', () => {
  it('requires a title and a date', () => {
    expect(isValidPv('PV', '2026-01-01')).toBe(true);
    expect(isValidPv('  ', '2026-01-01')).toBe(false);
    expect(isValidPv('PV', '')).toBe(false);
  });
});

describe('searchPv', () => {
  it('matches title, category and content, accent-insensitively', () => {
    expect(searchPv(docs, 'aga').map((d) => d.id)).toEqual(['1']);
    expect(searchPv(docs, 'receptie').map((d) => d.id)).toEqual(['3']);
    expect(searchPv(docs, 'salubritate').map((d) => d.id)).toEqual(['2']);
  });

  it('returns all when query is empty', () => {
    expect(searchPv(docs, '  ')).toHaveLength(3);
  });
});

describe('sortPv', () => {
  it('orders newest document date first', () => {
    expect(sortPv(docs).map((d) => d.id)).toEqual(['3', '1', '2']);
  });
});

describe('pvCategories', () => {
  it('lists distinct categories alphabetically', () => {
    expect(pvCategories(docs)).toEqual(['AGA', 'Comitet', 'Recepție']);
  });
});
