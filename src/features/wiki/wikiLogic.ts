import type { WikiPage } from '@/shared/types/domain';
import { normalizeSearch } from '@/features/faq/faqLogic';

/** A wiki page needs a title and a body. */
export function isValidPage(title: string, body: string): boolean {
  return title.trim().length > 0 && body.trim().length > 0;
}

/** Build a URL-safe slug from a title (accent-insensitive). */
export function slugify(title: string): string {
  return normalizeSearch(title.trim())
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Search by title or body (accent-insensitive). */
export function searchPages(pages: WikiPage[], query: string): WikiPage[] {
  const q = normalizeSearch(query.trim());
  if (!q) return pages;
  return pages.filter((p) => normalizeSearch(`${p.title} ${p.body_md}`).includes(q));
}

/** Pages sorted alphabetically by title. */
export function sortPages(pages: WikiPage[]): WikiPage[] {
  return [...pages].sort((a, b) => a.title.localeCompare(b.title, 'ro'));
}
