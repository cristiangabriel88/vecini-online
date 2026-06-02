import { describe, expect, it } from 'vitest';
import {
  helpfulnessRatio,
  searchFaq,
  visibleFaq,
  nextSortOrder,
  isSavableFaq,
  newFaqEntry,
} from '@/features/faq/faqLogic';
import type { FaqEntry } from '@/shared/types/domain';

const entries: FaqEntry[] = [
  { id: '1', asociatie_id: 'a', category: 'Utilități', question: 'Când vine apa caldă?', answer: 'În 20-40 de minute.', sort_order: 0, helpful_count: 3, not_helpful_count: 1, archived: false },
  { id: '2', asociatie_id: 'a', category: 'Plăți', question: 'Ce este fondul de rulment?', answer: 'O garanție.', sort_order: 1, helpful_count: 0, not_helpful_count: 0, archived: false },
];

describe('faq logic', () => {
  it('computes helpfulness ratio and guards division by zero', () => {
    expect(helpfulnessRatio(3, 1)).toBeCloseTo(0.75);
    expect(helpfulnessRatio(0, 0)).toBe(0);
  });

  it('searches across question, answer and category, ignoring diacritics', () => {
    expect(searchFaq(entries, '')).toHaveLength(2);
    expect(searchFaq(entries, 'apa calda').map((e) => e.id)).toEqual(['1']);
    expect(searchFaq(entries, 'PLATI').map((e) => e.id)).toEqual(['2']);
    expect(searchFaq(entries, 'inexistent')).toHaveLength(0);
  });

  it('hides archived entries and orders by sort_order', () => {
    const mixed: FaqEntry[] = [
      { ...entries[1] },
      { ...entries[0] },
      { ...entries[0], id: '3', sort_order: 2, archived: true },
    ];
    const out = visibleFaq(mixed);
    expect(out.map((e) => e.id)).toEqual(['1', '2']);
  });

  it('computes the next sort order, including the empty case', () => {
    expect(nextSortOrder(entries)).toBe(2);
    expect(nextSortOrder([])).toBe(0);
  });

  it('validates a savable entry input', () => {
    expect(isSavableFaq({ category: 'A', question: 'Q?', answer: 'R' })).toBe(true);
    expect(isSavableFaq({ category: '  ', question: 'Q?', answer: 'R' })).toBe(false);
    expect(isSavableFaq({ category: 'A', question: '', answer: 'R' })).toBe(false);
  });

  it('builds a fresh entry appended after the existing ones', () => {
    const created = newFaqEntry(
      { category: ' Plăți ', question: '  Cum plătesc?  ', answer: ' Online. ' },
      'a',
      entries,
      'new-1',
    );
    expect(created).toMatchObject({
      id: 'new-1',
      asociatie_id: 'a',
      category: 'Plăți',
      question: 'Cum plătesc?',
      answer: 'Online.',
      sort_order: 2,
      helpful_count: 0,
      not_helpful_count: 0,
      archived: false,
    });
  });
});
