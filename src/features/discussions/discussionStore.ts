import { create } from 'zustand';
import type { DiscussionThread } from '@/shared/types/domain';
import { useAuthStore } from '@/shared/store/authStore';
import {
  type MessageAuthor,
  type NewThreadInput,
  type ThreadsByAsociatie,
  addMessageIn,
  addThreadIn,
  deleteMessageIn,
  newMessage,
  newThread,
  seedThreads,
  threadsForAsociatie,
  togglePinIn,
} from './discussionLogic';

interface DiscussionState {
  /** Discussion threads per asociație, keyed by asociație id. */
  byAsociatie: ThreadsByAsociatie;
  /** Non-null when the last live fetch failed; null in demo/offline mode or after a successful fetch. */
  fetchError: string | null;
  /** Open a thread in one asociație. */
  addThread: (asociatieId: string, input: NewThreadInput) => void;
  /** Post a message authored by `author` to a thread in one asociație. */
  postMessage: (asociatieId: string, threadId: string, body: string, author: MessageAuthor) => void;
  togglePin: (asociatieId: string, threadId: string) => void;
  deleteMessage: (asociatieId: string, threadId: string, messageId: string) => void;
  /** Replace the full thread list for one asociație (used by live hydration). */
  replaceForAsociatie: (asociatieId: string, threads: DiscussionThread[]) => void;
  /** Set or clear the live-fetch error (called by the API layer). */
  setFetchError: (msg: string | null) => void;
  /** The threads for one asociație (stable reference). */
  forAsociatie: (asociatieId: string | null) => DiscussionThread[];
}

/**
 * Discuții / forum scoped per asociație (T48): the demo asociație is seeded so
 * the offline app is populated, and a new thread or message lands only in the
 * active asociație's list. The demo store is the offline source of truth; live
 * read/write against `discussion_threads` + `discussion_messages` under RLS is
 * T57.
 */
export const useDiscussionStore = create<DiscussionState>((set, get) => ({
  byAsociatie: seedThreads(),
  fetchError: null,
  addThread: (asociatieId, input) =>
    set((s) => ({
      byAsociatie: addThreadIn(s.byAsociatie, asociatieId, newThread(input, asociatieId)),
    })),
  postMessage: (asociatieId, threadId, body, author) =>
    set((s) => ({
      byAsociatie: addMessageIn(
        s.byAsociatie,
        asociatieId,
        threadId,
        newMessage(threadId, body, author),
      ),
    })),
  togglePin: (asociatieId, threadId) =>
    set((s) => ({ byAsociatie: togglePinIn(s.byAsociatie, asociatieId, threadId) })),
  deleteMessage: (asociatieId, threadId, messageId) =>
    set((s) => ({ byAsociatie: deleteMessageIn(s.byAsociatie, asociatieId, threadId, messageId) })),
  replaceForAsociatie: (asociatieId, threads) =>
    set((s) => ({ byAsociatie: { ...s.byAsociatie, [asociatieId]: threads } })),
  setFetchError: (msg) => set({ fetchError: msg }),
  forAsociatie: (asociatieId) => threadsForAsociatie(get().byAsociatie, asociatieId),
}));

/** Hook: the discussion threads for the currently active asociație. */
export function useAsociatieThreads(): DiscussionThread[] {
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  return useDiscussionStore((s) => threadsForAsociatie(s.byAsociatie, asociatieId));
}
