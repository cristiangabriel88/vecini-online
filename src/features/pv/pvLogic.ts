import type { PvDocument } from '@/shared/types/domain';
import { normalizeSearch } from '@/features/faq/faqLogic';

/** A minutes document needs a title and a date. */
export function isValidPv(title: string, docDate: string): boolean {
  return title.trim().length > 0 && docDate.trim().length > 0;
}

/** Search by title, category or indexed content (accent-insensitive). */
export function searchPv(docs: PvDocument[], query: string): PvDocument[] {
  const q = normalizeSearch(query.trim());
  if (!q) return docs;
  return docs.filter((d) =>
    normalizeSearch(`${d.title} ${d.category} ${d.content_text}`).includes(q),
  );
}

/** Sort documents newest-first by their document date. */
export function sortPv(docs: PvDocument[]): PvDocument[] {
  return [...docs].sort(
    (a, b) => new Date(b.doc_date).getTime() - new Date(a.doc_date).getTime(),
  );
}

/** Distinct categories present, alphabetically. */
export function pvCategories(docs: PvDocument[]): string[] {
  return [...new Set(docs.map((d) => d.category))].sort((a, b) => a.localeCompare(b, 'ro'));
}
