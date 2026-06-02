import { describe, expect, it } from 'vitest';
import {
  type BudgetCatalog,
  activeCycle,
  budgetForAsociatie,
  fundedIds,
  isFunded,
  isValidProposal,
  migrateBudgetState,
  remainingBudget,
  seedBudget,
  sortByVotes,
} from '@/features/budget/budgetLogic';
import type { BudgetCycle, BudgetProposal } from '@/shared/types/domain';
import { DEMO_ASOCIATIE } from '@/shared/demo/demoData';

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

describe('per-asociație model', () => {
  it('seedBudget seeds the demo asociație', () => {
    const map = seedBudget();
    expect(map[DEMO_ASOCIATIE.id]).toBeDefined();
    expect(map[DEMO_ASOCIATIE.id].cycles.length).toBeGreaterThan(0);
  });

  it('budgetForAsociatie returns empty catalog for unknown id', () => {
    const map = seedBudget();
    const cat = budgetForAsociatie(map, 'unknown');
    expect(cat.cycles).toHaveLength(0);
  });

  it('budgetForAsociatie returns empty catalog for null', () => {
    const cat = budgetForAsociatie({}, null);
    expect(cat.cycles).toHaveLength(0);
  });

  it('migrateBudgetState always reseeds the demo asociație', () => {
    const migrated = migrateBudgetState({ byAsociatie: { 'other-asoc': { cycles: [] } } });
    expect(migrated[DEMO_ASOCIATIE.id]).toBeDefined();
    expect(migrated['other-asoc']).toBeDefined();
  });

  it('activeCycle picks the vot-phase cycle first', () => {
    const catalog: BudgetCatalog = {
      cycles: [
        { id: 'c1', asociatie_id: 'a', title: 'Old', pool: 1000, phase: 'incheiat', proposals: [] },
        { id: 'c2', asociatie_id: 'a', title: 'Active', pool: 5000, phase: 'vot', proposals: [] },
      ],
    };
    expect(activeCycle(catalog)?.id).toBe('c2');
  });

  it('activeCycle returns null for empty catalog', () => {
    expect(activeCycle({ cycles: [] })).toBeNull();
  });

  it('activeCycle falls back to the first cycle when none is active', () => {
    const catalog: BudgetCatalog = {
      cycles: [
        { id: 'c1', asociatie_id: 'a', title: 'Done', pool: 1000, phase: 'incheiat', proposals: [] },
      ],
    };
    expect(activeCycle(catalog)?.id).toBe('c1');
  });
});
