import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useAuthStore } from '@/shared/store/authStore';
import {
  type PollCatalog,
  type PollsByAsociatie,
  applyVote,
  catalogForAsociatie,
  migratePollsState,
  seedPolls,
  seedVoteCounts,
} from './pollLogic';

interface PollsState {
  /** Poll catalog per asociație, keyed by asociație id. */
  byAsociatie: PollsByAsociatie;
  /** Running vote counts keyed by (globally unique) option id. */
  counts: Record<string, number>;
  /** This device's cast ballots, keyed by poll id -> chosen option id. */
  myVotes: Record<string, string>;
  /** Non-null when the last live fetch failed; null in demo/offline mode or after a successful fetch. */
  fetchError: string | null;
  /** Record a ballot for one poll into the running counts (idempotent per poll). */
  vote: (pollId: string, optionId: string) => void;
  /** Replace one asociație's catalog (used by live hydration). */
  replaceForAsociatie: (asociatieId: string, catalog: PollCatalog) => void;
  /** Merge in counts from the attribution-free poll_tally RPC (live results). */
  mergeCounts: (counts: Record<string, number>) => void;
  /** Set or clear the live-fetch error (called by the API layer). */
  setFetchError: (msg: string | null) => void;
  /** The poll catalog for one asociație (stable reference). */
  forAsociatie: (asociatieId: string | null) => PollCatalog;
}

/**
 * Selection polls (F09) scoped per asociație (T189): the demo asociație is
 * seeded so the offline app is populated, and a hydrated/created poll lands only
 * in the active asociație's catalog. Persisted so a cast ballot survives reload;
 * version bumps reseed the demo asociație so stale demo content is refreshed.
 * Live read (catalog + poll_tally counts) and write (cast vote) against
 * `polls`/`poll_options`/`votes` under RLS is in `pollsApi.ts`.
 */
export const usePollsStore = create<PollsState>()(
  persist(
    (set, get) => ({
      byAsociatie: seedPolls(),
      counts: seedVoteCounts(),
      myVotes: {},
      fetchError: null,
      vote: (pollId, optionId) => {
        if (get().myVotes[pollId]) return;
        set((s) => ({
          counts: applyVote(s.counts, optionId),
          myVotes: { ...s.myVotes, [pollId]: optionId },
        }));
      },
      replaceForAsociatie: (asociatieId, catalog) =>
        set((s) => ({ byAsociatie: { ...s.byAsociatie, [asociatieId]: catalog } })),
      mergeCounts: (counts) => set((s) => ({ counts: { ...s.counts, ...counts } })),
      setFetchError: (msg) => set({ fetchError: msg }),
      forAsociatie: (asociatieId) => catalogForAsociatie(get().byAsociatie, asociatieId),
    }),
    {
      name: 'vecini.polls',
      version: 1,
      partialize: (s) => ({ byAsociatie: s.byAsociatie, counts: s.counts, myVotes: s.myVotes }),
      migrate: (persisted) => ({
        byAsociatie: migratePollsState(persisted),
        counts: (persisted as { counts?: Record<string, number> } | null)?.counts ?? seedVoteCounts(),
        myVotes: (persisted as { myVotes?: Record<string, string> } | null)?.myVotes ?? {},
      }),
    },
  ),
);

/** Hook: the poll catalog for the currently active asociație. */
export function useAsociatiePolls(): PollCatalog {
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  return usePollsStore((s) => catalogForAsociatie(s.byAsociatie, asociatieId));
}
