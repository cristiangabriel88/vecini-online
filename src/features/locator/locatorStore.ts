import { create } from 'zustand';
import type { ResidentPost, ResidentPostCategory } from '@/shared/types/domain';
import { DEMO_RESIDENT_POSTS } from '@/shared/demo/demoData';
import { expiresAt } from './locatorLogic';

export interface NewResidentPostInput {
  title: string;
  body: string;
  category: ResidentPostCategory;
}

interface LocatorState {
  items: ResidentPost[];
  /** Non-null when the last live fetch failed; null in demo/offline or after success. */
  fetchError: string | null;
  /** Create a post authored by the given user in one asociație; returns it. */
  add: (
    asociatieId: string,
    author: { id: string; name: string },
    input: NewResidentPostInput,
  ) => ResidentPost;
  remove: (id: string) => void;
  /** Update mutable fields of one post in place. */
  update: (id: string, patch: Pick<ResidentPost, 'title' | 'body' | 'category'>) => void;
  /** Replace the full list (used by live hydration). */
  replace: (items: ResidentPost[]) => void;
  /** Set or clear the live-fetch error (called by the API layer). */
  setFetchError: (msg: string | null) => void;
}

let seq = 0;
const nextId = (): string => `rp-new-${(seq += 1)}`;

export const useLocatorStore = create<LocatorState>((set) => ({
  items: [...DEMO_RESIDENT_POSTS],
  fetchError: null,
  add: (asociatieId, author, { title, body, category }) => {
    const now = new Date();
    const post: ResidentPost = {
      id: nextId(),
      asociatie_id: asociatieId,
      author_user_id: author.id,
      author_name: author.name,
      category,
      title,
      body,
      photo_path: null,
      expires_at: expiresAt(now).toISOString(),
      created_at: now.toISOString(),
    };
    set((s) => ({ items: [post, ...s.items] }));
    return post;
  },
  remove: (id) => set((s) => ({ items: s.items.filter((p) => p.id !== id) })),
  update: (id, patch) =>
    set((s) => ({ items: s.items.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
  replace: (items) => set({ items }),
  setFetchError: (msg) => set({ fetchError: msg }),
}));
