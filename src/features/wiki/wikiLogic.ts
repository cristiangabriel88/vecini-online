import type { WikiPage } from '@/shared/types/domain';
import { normalizeSearch } from '@/features/faq/faqLogic';
import { DEMO_ASOCIATIE, DEMO_WIKI } from '@/shared/demo/demoData';

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

/** Only admin/presedinte/comitet may create or edit wiki pages. */
export function canManageWiki(role: string | null): boolean {
  return role === 'admin' || role === 'presedinte' || role === 'comitet';
}

// ── Per-asociatie wiki catalog ───────────────────────────────────────────────

export type WikiByAsociatie = Record<string, WikiPage[]>;

const EMPTY_WIKI: WikiPage[] = [];

export function wikiForAsociatie(
  map: WikiByAsociatie,
  asociatieId: string | null,
): WikiPage[] {
  if (!asociatieId) return EMPTY_WIKI;
  return map[asociatieId] ?? EMPTY_WIKI;
}

export function seedWiki(): WikiByAsociatie {
  return { [DEMO_ASOCIATIE.id]: [...DEMO_WIKI] };
}

export function addPageIn(
  map: WikiByAsociatie,
  asociatieId: string,
  page: WikiPage,
): WikiByAsociatie {
  const current = map[asociatieId] ?? [];
  return { ...map, [asociatieId]: [page, ...current] };
}

export function updatePageIn(
  map: WikiByAsociatie,
  asociatieId: string,
  id: string,
  title: string,
  body: string,
): WikiByAsociatie {
  const pages = map[asociatieId] ?? [];
  const updated = pages.map((p) =>
    p.id === id
      ? { ...p, title: title.trim(), body_md: body.trim(), updated_at: new Date().toISOString() }
      : p,
  );
  return { ...map, [asociatieId]: updated };
}

export function migrateWikiState(persisted: unknown): WikiByAsociatie {
  const p = persisted as { byAsociatie?: WikiByAsociatie } | null;
  const existing = p?.byAsociatie ?? {};
  return { ...existing, [DEMO_ASOCIATIE.id]: [...DEMO_WIKI] };
}
