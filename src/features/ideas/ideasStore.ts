import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Idea } from '@/shared/types/domain';
import { useAuthStore } from '@/shared/store/authStore';
import { recordTimestamp, pruneTimestamps } from '@/shared/lib/contentGuard';
import {
  type IdeaCatalog,
  type IdeasByAsociatie,
  ideasForAsociatie,
  migrateIdeasState,
  seedIdeas,
} from './ideaLogic';

interface IdeasState {
  /** Idea catalog per asociație, keyed by asociație id. */
  byAsociatie: IdeasByAsociatie;
  /** This-device vote map: ideaId -> true when the user has voted. */
  myVotes: Record<string, boolean>;
  /** Non-null when the last live fetch failed; null in demo/offline or after success. */
  fetchError: string | null;
  /** Per-user submission timestamps keyed by `${asociatieId}:${userId}`. Not persisted. */
  postTimestamps: Record<string, number[]>;
  /** Prepend a new idea to one asociație's catalog (also marks it as voted). */
  addIdea: (asociatieId: string, idea: Idea) => void;
  /** Toggle this device's vote on an idea (optimistic, idempotent). */
  toggleVote: (asociatieId: string, ideaId: string) => void;
  /** Replace one asociație's full idea list (used by live hydration). */
  replaceForAsociatie: (asociatieId: string, items: Idea[]) => void;
  /** Set or clear the live-fetch error (called by the API layer). */
  setFetchError: (msg: string | null) => void;
  /** The idea catalog for one asociație (stable reference). */
  forAsociatie: (asociatieId: string | null) => IdeaCatalog;
  /** Record a submission for rate-limit accounting. */
  recordPost: (asociatieId: string, userId: string, now?: number) => void;
}

/**
 * Idea box (F14) scoped per asociație (T194): the demo asociație is seeded so
 * the offline app is populated. Persisted so a submitted idea and upvote survive
 * reload; version bumps reseed the demo asociație from DEMO_IDEAS so stale demo
 * content is refreshed. Live read/write against `ideas`/`idea_votes` under RLS
 * is in `ideasApi.ts`; this module stays the synchronous source of truth.
 */
export const useIdeasStore = create<IdeasState>()(
  persist(
    (set, get) => ({
      byAsociatie: seedIdeas(),
      myVotes: {},
      fetchError: null,
      postTimestamps: {},

      addIdea: (asociatieId, idea) =>
        set((s) => {
          const catalog = ideasForAsociatie(s.byAsociatie, asociatieId);
          return {
            byAsociatie: {
              ...s.byAsociatie,
              [asociatieId]: { items: [idea, ...catalog.items] },
            },
            myVotes: { ...s.myVotes, [idea.id]: true },
          };
        }),

      toggleVote: (asociatieId, ideaId) =>
        set((s) => {
          const voted = s.myVotes[ideaId] ?? false;
          const catalog = ideasForAsociatie(s.byAsociatie, asociatieId);
          return {
            myVotes: { ...s.myVotes, [ideaId]: !voted },
            byAsociatie: {
              ...s.byAsociatie,
              [asociatieId]: {
                items: catalog.items.map((i) =>
                  i.id === ideaId ? { ...i, votes: i.votes + (voted ? -1 : 1) } : i,
                ),
              },
            },
          };
        }),

      replaceForAsociatie: (asociatieId, items) =>
        set((s) => ({ byAsociatie: { ...s.byAsociatie, [asociatieId]: { items } } })),

      setFetchError: (msg) => set({ fetchError: msg }),

      forAsociatie: (asociatieId) => ideasForAsociatie(get().byAsociatie, asociatieId),

      recordPost: (asociatieId, userId, now = Date.now()) =>
        set((s) => {
          const key = `${asociatieId}:${userId}`;
          return {
            postTimestamps: {
              ...s.postTimestamps,
              [key]: recordTimestamp(s.postTimestamps[key] ?? [], now),
            },
          };
        }),
    }),
    {
      name: 'vecini.ideas',
      version: 1,
      partialize: (s) => ({ byAsociatie: s.byAsociatie, myVotes: s.myVotes }),
      migrate: (persisted) => ({ byAsociatie: migrateIdeasState(persisted) }),
    },
  ),
);

/** Recent idea submission count for one user (pruned to the sliding window). */
export function recentIdeaCount(
  postTimestamps: Record<string, number[]>,
  asociatieId: string,
  userId: string,
  now = Date.now(),
): number {
  const key = `${asociatieId}:${userId}`;
  return pruneTimestamps(postTimestamps[key] ?? [], now).length;
}

/** Hook: the idea catalog for the currently active asociație. */
export function useAsociatieIdeas(): IdeaCatalog {
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  return useIdeasStore((s) => ideasForAsociatie(s.byAsociatie, asociatieId));
}
