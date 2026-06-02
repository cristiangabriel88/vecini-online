import { beforeEach, describe, expect, it } from 'vitest';
import type { FaqEntry } from '@/shared/types/domain';
import { useFaqStore } from '@/features/faq/faqStore';
import {
  hydrateFaq,
  createFaqEntry,
  updateFaqEntry,
  archiveFaqEntry,
} from '@/features/faq/faqApi';

// faqApi offline-path tests (T186). Live-path tests require a real Supabase
// backend; CI exercises the offline path (isSupabaseConfigured === false), where
// each function applies its change to the store and the live mirror is skipped.

const SEED: FaqEntry[] = [
  { id: 'faq-a', asociatie_id: 'a', category: 'Plăți', question: 'Q1?', answer: 'A1', sort_order: 0, helpful_count: 2, not_helpful_count: 0, archived: false },
];

beforeEach(() => {
  useFaqStore.setState({ items: [...SEED], myVotes: {}, fetchError: null });
});

describe('hydrateFaq', () => {
  it('is a no-op when Supabase is not configured (offline/CI)', async () => {
    const before = useFaqStore.getState().items;
    await hydrateFaq('a');
    expect(useFaqStore.getState().items).toBe(before);
  });

  it('is a no-op when asociatieId is empty', async () => {
    const before = useFaqStore.getState().items;
    await hydrateFaq('');
    expect(useFaqStore.getState().items).toBe(before);
  });
});

describe('createFaqEntry', () => {
  it('appends a savable entry and returns it', () => {
    const created = createFaqEntry('a', { category: 'Contoare', question: 'Cum citesc?', answer: 'Cifrele negre.' });
    const items = useFaqStore.getState().items;
    expect(items).toHaveLength(2);
    expect(items[1]).toBe(created);
    expect(created.sort_order).toBe(1);
    expect(created.archived).toBe(false);
  });
});

describe('updateFaqEntry', () => {
  it('rewrites the editable fields, trimming whitespace', () => {
    updateFaqEntry('faq-a', { category: ' Utilități ', question: ' Q1 nou? ', answer: ' A1 nou ' });
    const entry = useFaqStore.getState().items.find((e) => e.id === 'faq-a');
    expect(entry).toMatchObject({ category: 'Utilități', question: 'Q1 nou?', answer: 'A1 nou' });
  });
});

describe('archiveFaqEntry', () => {
  it('marks the entry archived so it leaves the resident view', () => {
    archiveFaqEntry('faq-a');
    expect(useFaqStore.getState().items.find((e) => e.id === 'faq-a')?.archived).toBe(true);
  });
});
