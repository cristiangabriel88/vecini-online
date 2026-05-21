import { describe, expect, it } from 'vitest';
import { helpfulnessRatio, searchFaq } from '@/features/faq/faqLogic';
import type { FaqEntry } from '@/shared/types/domain';

const entries: FaqEntry[] = [
  { id: '1', asociatie_id: 'a', category: 'Utilități', question: 'Când vine apa caldă?', answer: 'În 20-40 de minute.', sort_order: 0, helpful_count: 3, not_helpful_count: 1 },
  { id: '2', asociatie_id: 'a', category: 'Plăți', question: 'Ce este fondul de rulment?', answer: 'O garanție.', sort_order: 1, helpful_count: 0, not_helpful_count: 0 },
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
});
