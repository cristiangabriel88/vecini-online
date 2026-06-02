import { create } from 'zustand';
import type { FaqEntry } from '@/shared/types/domain';
import { DEMO_FAQ } from '@/shared/demo/demoData';
import { type FaqEntryInput, newFaqEntry } from './faqLogic';

interface FaqState {
  items: FaqEntry[];
  myVotes: Record<string, boolean>; // faqId -> helpful?
  /** Non-null when the last live fetch failed; null in demo/offline or after success. */
  fetchError: string | null;
  vote: (id: string, helpful: boolean) => void;
  /** Replace the full list (used by live hydration). */
  replace: (items: FaqEntry[]) => void;
  /** Set or clear the live-fetch error (called by the API layer). */
  setFetchError: (msg: string | null) => void;
  /** Append a new entry for one asociație; returns the created entry. */
  addEntry: (asociatieId: string, input: FaqEntryInput) => FaqEntry;
  /** Update an existing entry's editable fields. */
  updateEntry: (id: string, input: FaqEntryInput) => void;
  /** Retire (archive) an entry so residents no longer see it. */
  archiveEntry: (id: string) => void;
}

let seq = 0;
const nextId = (): string => `faq-new-${(seq += 1)}`;

export const useFaqStore = create<FaqState>((set, get) => ({
  items: [...DEMO_FAQ],
  myVotes: {},
  fetchError: null,
  vote: (id, helpful) => {
    if (get().myVotes[id] !== undefined) return;
    set((s) => ({
      myVotes: { ...s.myVotes, [id]: helpful },
      items: s.items.map((e) =>
        e.id === id
          ? {
              ...e,
              helpful_count: e.helpful_count + (helpful ? 1 : 0),
              not_helpful_count: e.not_helpful_count + (helpful ? 0 : 1),
            }
          : e,
      ),
    }));
  },
  replace: (items) => set({ items }),
  setFetchError: (msg) => set({ fetchError: msg }),
  addEntry: (asociatieId, input) => {
    const entry = newFaqEntry(input, asociatieId, get().items, nextId());
    set((s) => ({ items: [...s.items, entry] }));
    return entry;
  },
  updateEntry: (id, input) =>
    set((s) => ({
      items: s.items.map((e) =>
        e.id === id
          ? {
              ...e,
              category: input.category.trim(),
              question: input.question.trim(),
              answer: input.answer.trim(),
            }
          : e,
      ),
    })),
  archiveEntry: (id) =>
    set((s) => ({ items: s.items.map((e) => (e.id === id ? { ...e, archived: true } : e)) })),
}));
