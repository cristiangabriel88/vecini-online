import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BudgetCycle, BudgetProposal } from '@/shared/types/domain';
import { useAuthStore } from '@/shared/store/authStore';
import {
  type BudgetCatalog,
  type BudgetsByAsociatie,
  activeCycle,
  budgetForAsociatie,
  migrateBudgetState,
  seedBudget,
} from './budgetLogic';

interface BudgetState {
  /** Budget catalog per asociație, keyed by asociație id. */
  byAsociatie: BudgetsByAsociatie;
  /** Non-null when the last live fetch failed; null in demo/offline mode or after a successful fetch. */
  fetchError: string | null;
  /** Prepend a proposal to a cycle within one asociație's catalog. */
  addProposal: (asociatieId: string, cycleId: string, proposal: BudgetProposal) => void;
  /** Toggle this device's vote on a proposal (optimistic, idempotent). */
  toggleVote: (asociatieId: string, cycleId: string, proposalId: string) => void;
  /** Replace one asociație's full catalog (used by live hydration). */
  replaceForAsociatie: (asociatieId: string, cycles: BudgetCycle[]) => void;
  /** Set or clear the live-fetch error (called by the API layer). */
  setFetchError: (msg: string | null) => void;
  /** The budget catalog for one asociație (stable reference). */
  forAsociatie: (asociatieId: string | null) => BudgetCatalog;
}

/** Apply a transform to one cycle within an asociație's catalog. */
function mapCycle(
  byAsociatie: BudgetsByAsociatie,
  asociatieId: string,
  cycleId: string,
  fn: (c: BudgetCycle) => BudgetCycle,
): BudgetsByAsociatie {
  const catalog = budgetForAsociatie(byAsociatie, asociatieId);
  return {
    ...byAsociatie,
    [asociatieId]: { cycles: catalog.cycles.map((c) => (c.id === cycleId ? fn(c) : c)) },
  };
}

/**
 * Participatory budget (F12) scoped per asociație (T192): the demo asociație is
 * seeded so the offline app is populated, and a hydrated/created proposal lands
 * only in the active asociație's catalog. Persisted so a submitted proposal and
 * cast vote survive reload; version bumps reseed the demo asociație so stale
 * demo content is refreshed. Live read (catalog) and write (propose/vote) against
 * `budget_cycles`/`budget_proposals`/`budget_votes` under RLS is in `budgetApi.ts`.
 */
export const useBudgetStore = create<BudgetState>()(
  persist(
    (set, get) => ({
      byAsociatie: seedBudget(),
      fetchError: null,

      addProposal: (asociatieId, cycleId, proposal) =>
        set((s) => ({
          byAsociatie: mapCycle(s.byAsociatie, asociatieId, cycleId, (c) => ({
            ...c,
            proposals: [...c.proposals, proposal],
          })),
        })),

      toggleVote: (asociatieId, cycleId, proposalId) =>
        set((s) => ({
          byAsociatie: mapCycle(s.byAsociatie, asociatieId, cycleId, (c) => ({
            ...c,
            proposals: c.proposals.map((p) =>
              p.id === proposalId
                ? { ...p, voted: !p.voted, votes: p.votes + (p.voted ? -1 : 1) }
                : p,
            ),
          })),
        })),

      replaceForAsociatie: (asociatieId, cycles) =>
        set((s) => ({ byAsociatie: { ...s.byAsociatie, [asociatieId]: { cycles } } })),

      setFetchError: (msg) => set({ fetchError: msg }),

      forAsociatie: (asociatieId) => budgetForAsociatie(get().byAsociatie, asociatieId),
    }),
    {
      name: 'vecini.budget',
      version: 1,
      partialize: (s) => ({ byAsociatie: s.byAsociatie }),
      migrate: (persisted) => ({ byAsociatie: migrateBudgetState(persisted) }),
    },
  ),
);

/** Hook: the budget catalog for the currently active asociație. */
export function useAsociatieBudget(): BudgetCatalog {
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  return useBudgetStore((s) => budgetForAsociatie(s.byAsociatie, asociatieId));
}

/** Hook: the most recent active cycle for the currently active asociație, or null. */
export function useActiveBudgetCycle(): BudgetCycle | null {
  const catalog = useAsociatieBudget();
  return activeCycle(catalog);
}
