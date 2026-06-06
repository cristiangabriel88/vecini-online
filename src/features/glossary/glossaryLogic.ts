import type { GlossaryEntry } from '@/shared/types/domain';
import { normalizeSearch } from '@/features/faq/faqLogic';
import { DEMO_ASOCIATIE, DEMO_GLOSSARY } from '@/shared/demo/demoData';
import { emptyArray } from '@/shared/lib/emptyArray';

/** Filter glossary entries by a query over term and definition, then sort
 *  alphabetically by term (Romanian locale). */
export function searchGlossary(entries: GlossaryEntry[], query: string): GlossaryEntry[] {
  const q = normalizeSearch(query.trim());
  return entries
    .filter((e) => !q || normalizeSearch(`${e.term} ${e.definition}`).includes(q))
    .sort((a, b) => a.term.localeCompare(b.term, 'ro'));
}

/** Find a single term by exact (case/diacritic-insensitive) name — used by the
 *  `/glosar <termen>` bot command and inline tooltips. */
export function findTerm(entries: GlossaryEntry[], term: string): GlossaryEntry | undefined {
  const q = normalizeSearch(term.trim());
  return entries.find((e) => normalizeSearch(e.term) === q);
}

// ── Per-asociatie glossary catalog ───────────────────────────────────────────

export type GlossaryByAsociatie = Record<string, GlossaryEntry[]>;

const EMPTY_GLOSSARY = emptyArray<GlossaryEntry>();

export function glossaryForAsociatie(
  map: GlossaryByAsociatie,
  asociatieId: string | null,
): GlossaryEntry[] {
  if (!asociatieId) return EMPTY_GLOSSARY;
  return map[asociatieId] ?? EMPTY_GLOSSARY;
}

export function seedGlossary(): GlossaryByAsociatie {
  return { [DEMO_ASOCIATIE.id]: [...DEMO_GLOSSARY] };
}

export function migrateGlossaryState(persisted: unknown): GlossaryByAsociatie {
  const p = persisted as { byAsociatie?: GlossaryByAsociatie } | null;
  const existing = p?.byAsociatie ?? {};
  return { ...existing, [DEMO_ASOCIATIE.id]: [...DEMO_GLOSSARY] };
}
