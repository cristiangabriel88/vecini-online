import type { DocumentRecord } from '@/shared/types/domain';
import { normalizeSearch } from '@/features/faq/faqLogic';

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

export type DocumentFileError = 'too_large' | 'bad_type';

/** Validate a candidate upload file; returns null when the file is acceptable. */
export function validateDocumentFile(file: {
  size: number;
  type: string;
}): DocumentFileError | null {
  if (file.size > DOCUMENT_MAX_BYTES) return 'too_large';
  if (!(DOCUMENT_ALLOWED_TYPES as readonly string[]).includes(file.type))
    return 'bad_type';
  return null;
}

/** True when the active role may upload or delete documents. */
export function canManageDocuments(role: string | null): boolean {
  return role === 'admin' || role === 'presedinte' || role === 'comitet';
}

/** Human-readable file size (B / KB / MB). */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Read a File as a base64 data URL (browser only). */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('read_failed'));
    reader.readAsDataURL(file);
  });
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
