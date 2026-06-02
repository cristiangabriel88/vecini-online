import { describe, expect, it } from 'vitest';
import {
  isValidPv,
  pvCategories,
  searchPv,
  sortPv,
  canManagePv,
  seedPvs,
  pvForAsociatie,
  newPvDocument,
  addPvIn,
  migratePvsState,
} from '@/features/pv/pvLogic';
import type { PvDocument } from '@/shared/types/domain';
import { DEMO_ASOCIATIE } from '@/shared/demo/demoData';

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

describe('canManagePv', () => {
  it('allows admin, presedinte, comitet', () => {
    expect(canManagePv('admin')).toBe(true);
    expect(canManagePv('presedinte')).toBe(true);
    expect(canManagePv('comitet')).toBe(true);
  });

  it('blocks proprietar, locatar, and null', () => {
    expect(canManagePv('proprietar')).toBe(false);
    expect(canManagePv('locatar')).toBe(false);
    expect(canManagePv(null)).toBe(false);
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

describe('per-asociație model', () => {
  it('seedPvs seeds the demo asociație', () => {
    const seeded = seedPvs();
    expect(Array.isArray(seeded[DEMO_ASOCIATIE.id])).toBe(true);
    expect(seeded[DEMO_ASOCIATIE.id].length).toBeGreaterThan(0);
  });

  it('pvForAsociatie returns empty for unknown or null id', () => {
    expect(pvForAsociatie({}, 'unknown')).toEqual([]);
    expect(pvForAsociatie({}, null)).toEqual([]);
  });

  it('newPvDocument creates a document with trimmed fields and defaults category', () => {
    const doc = newPvDocument(
      { title: '  Titlu  ', doc_date: '2026-06-01', category: '', content_text: 'detalii' },
      'asoc-1',
    );
    expect(doc.title).toBe('Titlu');
    expect(doc.category).toBe('Altele');
    expect(doc.storage_path).toBeNull();
    expect(doc.asociatie_id).toBe('asoc-1');
  });

  it('addPvIn prepends a document to the asociație list', () => {
    const by = { 'asoc-1': [docs[0]] };
    const updated = addPvIn(by, 'asoc-1', docs[1]);
    expect(updated['asoc-1'][0].id).toBe(docs[1].id);
    expect(updated['asoc-1']).toHaveLength(2);
  });

  it('migratePvsState reseeds the demo asociație, keeps others', () => {
    const persisted = { byAsociatie: { 'other-asoc': [docs[2]], [DEMO_ASOCIATIE.id]: [] } };
    const result = migratePvsState(persisted);
    expect(result['other-asoc']).toHaveLength(1);
    expect(result[DEMO_ASOCIATIE.id].length).toBeGreaterThan(0);
  });
});
