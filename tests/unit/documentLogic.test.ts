import { describe, expect, it } from 'vitest';
import {
  DOCUMENT_MAX_BYTES,
  canManageDocuments,
  formatFileSize,
  isValidDocument,
  searchDocuments,
  validateDocumentFile,
} from '@/features/documents/documentLogic';
import type { DocumentRecord } from '@/shared/types/domain';

const base: Omit<DocumentRecord, 'id' | 'category' | 'title' | 'content_text' | 'created_at'> = {
  asociatie_id: 'a',
  storage_path: null,
  file_name: null,
  file_size: null,
  file_type: null,
  file_data_url: null,
  version: 1,
};

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

describe('validateDocumentFile', () => {
  it('accepts a valid PDF under the size limit', () => {
    expect(validateDocumentFile({ size: 1024, type: 'application/pdf' })).toBeNull();
  });

  it('rejects a file over 10 MB', () => {
    expect(validateDocumentFile({ size: DOCUMENT_MAX_BYTES + 1, type: 'application/pdf' })).toBe('too_large');
  });

  it('rejects a disallowed MIME type', () => {
    expect(validateDocumentFile({ size: 100, type: 'application/zip' })).toBe('bad_type');
    expect(validateDocumentFile({ size: 100, type: 'video/mp4' })).toBe('bad_type');
  });

  it('accepts allowed image and office types', () => {
    expect(validateDocumentFile({ size: 500, type: 'image/jpeg' })).toBeNull();
    expect(validateDocumentFile({ size: 500, type: 'image/png' })).toBeNull();
    expect(
      validateDocumentFile({ size: 500, type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }),
    ).toBeNull();
  });
});

describe('canManageDocuments', () => {
  it('returns true for admin, presedinte, comitet', () => {
    expect(canManageDocuments('admin')).toBe(true);
    expect(canManageDocuments('presedinte')).toBe(true);
    expect(canManageDocuments('comitet')).toBe(true);
  });

  it('returns false for residents and null', () => {
    expect(canManageDocuments('proprietar')).toBe(false);
    expect(canManageDocuments('locatar')).toBe(false);
    expect(canManageDocuments('cenzor')).toBe(false);
    expect(canManageDocuments(null)).toBe(false);
  });
});

describe('formatFileSize', () => {
  it('formats bytes, kilobytes and megabytes', () => {
    expect(formatFileSize(512)).toBe('512 B');
    expect(formatFileSize(2048)).toBe('2.0 KB');
    expect(formatFileSize(5 * 1024 * 1024)).toBe('5.0 MB');
  });
});
