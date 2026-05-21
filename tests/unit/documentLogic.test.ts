import { describe, expect, it } from 'vitest';
import { isValidDocument, searchDocuments } from '@/features/documents/documentLogic';
import type { DocumentRecord } from '@/shared/types/domain';

const base = { asociatie_id: 'a', storage_path: null, version: 1 };

const docs: DocumentRecord[] = [
  { ...base, id: '1', category: 'statut', title: 'Statutul asociației', content_text: 'adoptat 2019', created_at: '2023-03-15T09:00:00Z' },
  { ...base, id: '2', category: 'contract', title: 'Contract salubritate', content_text: 'ridicare gunoi', created_at: '2026-01-10T09:00:00Z' },
  { ...base, id: '3', category: 'regulament', title: 'Regulament intern', content_text: 'liniște și parcare', created_at: '2022-09-01T09:00:00Z' },
];

describe('isValidDocument', () => {
  it('requires a short title', () => {
    expect(isValidDocument('Act')).toBe(true);
    expect(isValidDocument('  ')).toBe(false);
    expect(isValidDocument('ab')).toBe(false);
  });
});

describe('searchDocuments', () => {
  it('returns all docs newest-first by default', () => {
    expect(searchDocuments(docs).map((d) => d.id)).toEqual(['2', '1', '3']);
  });

  it('filters by category', () => {
    expect(searchDocuments(docs, '', 'contract').map((d) => d.id)).toEqual(['2']);
  });

  it('matches title or content ignoring diacritics', () => {
    expect(searchDocuments(docs, 'statut').map((d) => d.id)).toEqual(['1']);
    expect(searchDocuments(docs, 'liniste').map((d) => d.id)).toEqual(['3']);
  });
});
