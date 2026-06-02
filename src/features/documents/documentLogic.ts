import type { DocumentRecord } from '@/shared/types/domain';
import { normalizeSearch } from '@/features/faq/faqLogic';
import { type FileValidationError, validateFile } from '@/shared/lib/file';

export { formatFileSize, readFileAsDataUrl } from '@/shared/lib/file';

/** Document categories used in the archive filter / upload form. */
export const DOCUMENT_CATEGORIES = [
  'statut',
  'regulament',
  'contract',
  'cadastru',
  'proces-verbal',
  'altele',
] as const;

/** Maximum file size accepted for offline storage (10 MB). */
export const DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;

/** MIME types accepted for document uploads. */
export const DOCUMENT_ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
] as const;

/** accept="" value for <input type="file"> matching DOCUMENT_ALLOWED_TYPES. */
export const DOCUMENT_ACCEPT =
  '.pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.xls,.xlsx,.txt';

export type DocumentFileError = FileValidationError;

/** Validate a candidate upload file; returns null when the file is acceptable. */
export function validateDocumentFile(file: {
  size: number;
  type: string;
}): DocumentFileError | null {
  return validateFile(file, DOCUMENT_MAX_BYTES, DOCUMENT_ALLOWED_TYPES);
}

/** True when the active role may upload or delete documents. */
export function canManageDocuments(role: string | null): boolean {
  return role === 'admin' || role === 'presedinte' || role === 'comitet';
}

/** A document needs at least a short title. */
export function isValidDocument(title: string): boolean {
  return title.trim().length >= 3;
}

/** Filter documents by category and free-text query (title + content + category),
 *  newest first. */
export function searchDocuments(
  docs: DocumentRecord[],
  query = '',
  category = 'all',
): DocumentRecord[] {
  const q = normalizeSearch(query.trim());
  return docs
    .filter((d) => (category === 'all' ? true : d.category === category))
    .filter((d) =>
      q ? normalizeSearch(`${d.title} ${d.content_text ?? ''} ${d.category}`).includes(q) : true,
    )
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}
