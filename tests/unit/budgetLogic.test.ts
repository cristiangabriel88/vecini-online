import { describe, expect, it } from 'vitest';
import {
  fundedIds,
  isFunded,
  isValidProposal,
  remainingBudget,
  sortByVotes,
} from '@/features/budget/budgetLogic';
import type { BudgetCycle, BudgetProposal } from '@/shared/types/domain';

const prop = (id: string, cost: number, votes: number): BudgetProposal => ({
  id,
  cycle_id: 'c1',
  title: id,
  cost,
  author_name: 'A',
  votes,
  voted: false,
});

const cycle: BudgetCycle = {
  id: 'c1',
  asociatie_id: 'a',
  title: 'Fond 2026',
  pool: 5000,
  phase: 'vot',
  proposals: [prop('p1', 3000, 10), prop('p2', 2500, 8), prop('p3', 1500, 5)],
};

describe('isValidProposal', () => {
  it('requires a title and a positive cost', () => {
    expect(isValidProposal('Bănci', 1200)).toBe(true);
    expect(isValidProposal(' ', 1200)).toBe(false);
    expect(isValidProposal('Bănci', 0)).toBe(false);
    expect(isValidProposal('Bănci', -5)).toBe(false);
  });
});

describe('sortByVotes', () => {
  it('orders by votes descending', () => {
    expect(sortByVotes(cycle.proposals).map((p) => p.id)).toEqual(['p1', 'p2', 'p3']);
  });
});

describe('fundedIds / remainingBudget', () => {
  it('greedily funds the top-voted within the pool', () => {
    // p1 (3000) then p2 would be 5500 > 5000, skip; p3 (1500) fits → 4500.
    const funded = fundedIds(cycle);
    expect(funded.has('p1')).toBe(true);
    expect(funded.has('p2')).toBe(false);
    expect(funded.has('p3')).toBe(true);
    expect(remainingBudget(cycle)).toBe(500);
  });
});

describe('isFunded', () => {
  it('reflects the funded cut', () => {
    expect(isFunded(cycle.proposals[0], cycle)).toBe(true);
    expect(isFunded(cycle.proposals[1], cycle)).toBe(false);
  });
});
