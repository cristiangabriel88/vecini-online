import type { PvDocument } from '@/shared/types/domain';
import { normalizeSearch } from '@/features/faq/faqLogic';
import { DEMO_PV_DOCUMENTS, DEMO_ASOCIATIE } from '@/shared/demo/demoData';
import { genId } from '@/shared/lib/id';

// ── Validation ──────────────────────────────────────────────────────────────

/** A minutes document needs a title and a date. */
export function isValidPv(title: string, docDate: string): boolean {
  return title.trim().length > 0 && docDate.trim().length > 0;
}

/** Returns true when the role may create or upload PV documents. */
export function canManagePv(role: string | null): boolean {
  return role === 'admin' || role === 'presedinte' || role === 'comitet';
}

// ── Search / sort / categories ───────────────────────────────────────────────

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

// ── Per-asociație model ──────────────────────────────────────────────────────

export type PvsByAsociatie = Record<string, PvDocument[]>;

export interface NewPvInput {
  title: string;
  doc_date: string;
  category: string;
  content_text: string;
}

export function seedPvs(): PvsByAsociatie {
  return { [DEMO_ASOCIATIE.id]: [...DEMO_PV_DOCUMENTS] };
}

export function pvForAsociatie(
  byAsociatie: PvsByAsociatie,
  id: string | null,
): PvDocument[] {
  if (!id) return [];
  return byAsociatie[id] ?? [];
}

export function newPvDocument(input: NewPvInput, asociatieId: string): PvDocument {
  return {
    id: genId(),
    asociatie_id: asociatieId,
    title: input.title.trim(),
    doc_date: input.doc_date,
    category: input.category.trim() || 'Altele',
    content_text: input.content_text.trim(),
    storage_path: null,
    created_at: new Date().toISOString(),
  };
}

export function addPvIn(
  byAsociatie: PvsByAsociatie,
  asociatieId: string,
  doc: PvDocument,
): PvsByAsociatie {
  const current = byAsociatie[asociatieId] ?? [];
  return { ...byAsociatie, [asociatieId]: [doc, ...current] };
}

export function migratePvsState(persisted: unknown): PvsByAsociatie {
  const base: PvsByAsociatie =
    (persisted as { byAsociatie?: PvsByAsociatie } | undefined)?.byAsociatie ?? {};
  return { ...base, [DEMO_ASOCIATIE.id]: [...DEMO_PV_DOCUMENTS] };
}
