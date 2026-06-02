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

/** Resident-visible entries (archived ones hidden), ordered by sort_order. */
export function visibleFaq(entries: FaqEntry[]): FaqEntry[] {
  return entries
    .filter((e) => !e.archived)
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order);
}

/** Next sort_order to append after the current highest (0 when empty). */
export function nextSortOrder(entries: FaqEntry[]): number {
  return entries.reduce((max, e) => Math.max(max, e.sort_order), -1) + 1;
}

/** Fields a comitet member supplies when creating or editing an FAQ entry. */
export interface FaqEntryInput {
  category: string;
  question: string;
  answer: string;
}

/** Whether an FAQ entry input is complete enough to save. */
export function isSavableFaq(input: FaqEntryInput): boolean {
  return input.category.trim() !== '' && input.question.trim() !== '' && input.answer.trim() !== '';
}

/** Build a fresh FAQ entry for one asociație, appended after the existing ones. */
export function newFaqEntry(
  input: FaqEntryInput,
  asociatieId: string,
  existing: FaqEntry[],
  id: string,
): FaqEntry {
  return {
    id,
    asociatie_id: asociatieId,
    category: input.category.trim(),
    question: input.question.trim(),
    answer: input.answer.trim(),
    sort_order: nextSortOrder(existing),
    helpful_count: 0,
    not_helpful_count: 0,
    archived: false,
  };
}

export { normalize as normalizeSearch };
