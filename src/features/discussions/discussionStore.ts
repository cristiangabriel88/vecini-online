import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DiscussionThread } from '@/shared/types/domain';
import { useAuthStore } from '@/shared/store/authStore';
import {
  type MessageAuthor,
  type NewThreadInput,
  type ThreadsByAsociatie,
  addMessageIn,
  addThreadIn,
  deleteMessageIn,
  deleteThreadIn,
  migrateThreadsState,
  newMessage,
  newThread,
  prunePostTimestamps,
  seedThreads,
  threadsForAsociatie,
  togglePinIn,
} from './discussionLogic';

interface DiscussionState {
  /** Discussion threads per asociație, keyed by asociație id. */
  byAsociatie: ThreadsByAsociatie;
  /** Non-null when the last live fetch failed; null in demo/offline mode or after a successful fetch. */
  fetchError: string | null;
  /**
   * Per-author post timestamps for rate limiting, keyed by `${asociatieId}:${userId}`.
   * Not persisted -- entries are pruned to a 1-hour window and reset on each
   * page load, which is acceptable for a soft anti-spam guard.
   */
  postTimestamps: Record<string, number[]>;
  /** Record a post (thread or message) for rate-limit accounting. */
  recordPost: (asociatieId: string, userId: string, now?: number) => void;
  /** Open a thread in one asociație. */
  addThread: (asociatieId: string, input: NewThreadInput) => void;
  /** Post a message authored by `author` to a thread in one asociație. */
  postMessage: (asociatieId: string, threadId: string, body: string, author: MessageAuthor) => void;
  togglePin: (asociatieId: string, threadId: string) => void;
  deleteMessage: (asociatieId: string, threadId: string, messageId: string) => void;
  deleteThread: (asociatieId: string, threadId: string) => void;
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
 * active asociație's list. Persisted so threads survive reload (T65); version
 * bumps reseed the demo asociație so stale demo content is refreshed. Live
 * read/write against `discussion_threads` + `discussion_messages` under RLS is
 * T57.
 */
export const useDiscussionStore = create<DiscussionState>()(
  persist(
    (set, get) => ({
      byAsociatie: seedThreads(),
      fetchError: null,
      postTimestamps: {},
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
        set((s) => ({
          byAsociatie: deleteMessageIn(s.byAsociatie, asociatieId, threadId, messageId),
        })),
      deleteThread: (asociatieId, threadId) =>
        set((s) => ({
          byAsociatie: deleteThreadIn(s.byAsociatie, asociatieId, threadId),
        })),
      replaceForAsociatie: (asociatieId, threads) =>
        set((s) => ({ byAsociatie: { ...s.byAsociatie, [asociatieId]: threads } })),
      setFetchError: (msg) => set({ fetchError: msg }),
      recordPost: (asociatieId, userId, now = Date.now()) =>
        set((s) => {
          const key = `${asociatieId}:${userId}`;
          return {
            postTimestamps: {
              ...s.postTimestamps,
              [key]: [...prunePostTimestamps(s.postTimestamps[key] ?? [], now), now],
            },
          };
        }),
      forAsociatie: (asociatieId) => threadsForAsociatie(get().byAsociatie, asociatieId),
    }),
    {
      name: 'vecini.discussions',
      version: 1,
      partialize: (s) => ({ byAsociatie: s.byAsociatie }),
      migrate: (persisted) => ({ byAsociatie: migrateThreadsState(persisted) }),
    },
  ),
);

/** Hook: the discussion threads for the currently active asociație. */
export function useAsociatieThreads(): DiscussionThread[] {
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  return useDiscussionStore((s) => threadsForAsociatie(s.byAsociatie, asociatieId));
}
