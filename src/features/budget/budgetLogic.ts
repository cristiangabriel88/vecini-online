import type { BudgetCycle, BudgetProposal } from '@/shared/types/domain';
import { DEMO_ASOCIATIE, DEMO_BUDGET_CYCLE } from '@/shared/demo/demoData';

/**
 * Participatory budget model (F12).
 *
 * Pure helpers so the demo store stays the offline source of truth and the
 * propose/vote/greedy-funding cycle works fully offline. Each asociație owns its
 * own budget catalog keyed by asociație id so proposals belong to the active
 * tenant and never leak across asociații. With a real backend the catalog is
 * hydrated from `budget_cycles`/`budget_proposals`/`budget_votes` under RLS.
 * Live read/write is in `budgetApi.ts`; this module stays the single source of
 * the per-asociație partitioning, the catalog shape and the funding rule.
 */

/** One asociație's budget: all its cycles (open + closed). */
export interface BudgetCatalog {
  cycles: BudgetCycle[];
}

/** Every asociație's budget catalog, keyed by asociație id. */
export type BudgetsByAsociatie = Record<string, BudgetCatalog>;

const EMPTY_CATALOG: BudgetCatalog = Object.freeze({ cycles: [] as BudgetCycle[] });

/** Deep-clone one cycle so mutations do not affect the demo seed. */
function cloneCycle(c: BudgetCycle): BudgetCycle {
  return { ...c, proposals: c.proposals.map((p) => ({ ...p })) };
}

/** Initial store state: the demo asociație gets the seeded cycle. */
export function seedBudget(): BudgetsByAsociatie {
  return { [DEMO_ASOCIATIE.id]: { cycles: [cloneCycle(DEMO_BUDGET_CYCLE)] } };
}

/** The budget catalog for one asociație (stable reference, never null). */
export function budgetForAsociatie(
  map: BudgetsByAsociatie,
  asociatieId: string | null,
): BudgetCatalog {
  if (!asociatieId) return EMPTY_CATALOG;
  return map[asociatieId] ?? EMPTY_CATALOG;
}

/**
 * Migrate persisted state to the current shape. Preserves non-demo asociații
 * and always reseeds the demo asociație from DEMO_BUDGET_CYCLE so stale demo
 * content is refreshed on version bump.
 */
export function migrateBudgetState(persisted: unknown): BudgetsByAsociatie {
  const p = persisted as { byAsociatie?: BudgetsByAsociatie } | null;
  const existing = p?.byAsociatie ?? {};
  return { ...existing, [DEMO_ASOCIATIE.id]: { cycles: [cloneCycle(DEMO_BUDGET_CYCLE)] } };
}

/**
 * The most recent active cycle (phase 'vot' or 'idei'), falling back to the
 * first cycle. Returns null when the catalog is empty.
 */
export function activeCycle(catalog: BudgetCatalog): BudgetCycle | null {
  if (!catalog.cycles.length) return null;
  return catalog.cycles.find((c) => c.phase === 'vot' || c.phase === 'idei') ?? catalog.cycles[0];
}

/** A proposal needs a title and a positive cost. */
export function isValidProposal(title: string, cost: number): boolean {
  return title.trim().length > 0 && Number.isFinite(cost) && cost > 0;
}

/** Proposals ordered by votes, most first; ties keep input order. */
export function sortByVotes(proposals: BudgetProposal[]): BudgetProposal[] {
  return [...proposals].sort((a, b) => b.votes - a.votes);
}

/** IDs of the proposals that fit the pool, taken greedily by vote rank. */
export function fundedIds(cycle: BudgetCycle): Set<string> {
  const funded = new Set<string>();
  let spent = 0;
  for (const p of sortByVotes(cycle.proposals)) {
    if (spent + p.cost <= cycle.pool) {
      funded.add(p.id);
      spent += p.cost;
    }
  }
  return funded;
}

/** Lei still available after funding the currently-winning proposals. */
export function remainingBudget(cycle: BudgetCycle): number {
  const funded = fundedIds(cycle);
  const spent = cycle.proposals
    .filter((p) => funded.has(p.id))
    .reduce((sum, p) => sum + p.cost, 0);
  return cycle.pool - spent;
}

/** Whether a proposal currently makes the funded cut. */
export function isFunded(proposal: BudgetProposal, cycle: BudgetCycle): boolean {
  return fundedIds(cycle).has(proposal.id);
}
