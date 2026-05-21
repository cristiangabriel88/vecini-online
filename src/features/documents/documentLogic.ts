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
