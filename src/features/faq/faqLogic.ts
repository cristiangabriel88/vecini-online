import type { FaqEntry } from '@/shared/types/domain';

/** Share of helpful votes (0–1). Returns 0 when there are no votes. */
export function helpfulnessRatio(helpful: number, notHelpful: number): number {
  const total = helpful + notHelpful;
  return total === 0 ? 0 : helpful / total;
}

/** Diacritic- and case-insensitive match used by FAQ/glossary search. */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/** Filter FAQ entries by a free-text query over question, answer and category. */
export function searchFaq(entries: FaqEntry[], query: string): FaqEntry[] {
  const q = normalize(query.trim());
  if (!q) return entries;
  return entries.filter((e) =>
    normalize(`${e.question} ${e.answer} ${e.category}`).includes(q),
  );
}

export { normalize as normalizeSearch };
