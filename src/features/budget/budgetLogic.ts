import type { BudgetCycle, BudgetProposal } from '@/shared/types/domain';

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
