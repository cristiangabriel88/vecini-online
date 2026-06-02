import { beforeEach, describe, expect, it } from 'vitest';
import { useBudgetStore } from '@/features/budget/budgetStore';
import { hydrateBudget, proposeItem, castBudgetVote } from '@/features/budget/budgetApi';
import { activeCycle, budgetForAsociatie, seedBudget } from '@/features/budget/budgetLogic';
import { DEMO_ASOCIATIE } from '@/shared/demo/demoData';
import type { BudgetProposal } from '@/shared/types/domain';

// budgetApi offline-path tests (T192).
// Live-path tests require a real Supabase backend; the offline path
// (isSupabaseConfigured === false) is what CI exercises here. Key contracts:
//   - hydrateBudget: no-op when not configured / empty id (store untouched)
//   - proposeItem: applies synchronously to the store, offline-safe
//   - castBudgetVote: toggles the proposal's voted flag and increments votes

const ASOC = DEMO_ASOCIATIE.id;

function makeProposal(overrides?: Partial<BudgetProposal>): BudgetProposal {
  const cycle = activeCycle(budgetForAsociatie(useBudgetStore.getState().byAsociatie, ASOC));
  return {
    id: `bp-test-${Date.now()}`,
    cycle_id: cycle?.id ?? 'bc-1',
    title: 'Rampe acces',
    cost: 1200,
    author_name: 'Test User',
    votes: 0,
    voted: false,
    ...overrides,
  };
}

beforeEach(() => {
  useBudgetStore.setState({ byAsociatie: seedBudget(), fetchError: null });
});

describe('hydrateBudget', () => {
  it('is a no-op when Supabase is not configured (offline/CI)', async () => {
    const before = useBudgetStore.getState().byAsociatie;
    await hydrateBudget(ASOC);
    expect(useBudgetStore.getState().byAsociatie).toBe(before);
    expect(useBudgetStore.getState().fetchError).toBeNull();
  });

  it('is a no-op when asociatieId is empty', async () => {
    const before = useBudgetStore.getState().byAsociatie;
    await hydrateBudget('');
    expect(useBudgetStore.getState().byAsociatie).toBe(before);
  });
});

describe('proposeItem', () => {
  it('adds a proposal to the store synchronously', () => {
    const catalog = budgetForAsociatie(useBudgetStore.getState().byAsociatie, ASOC);
    const cycle = activeCycle(catalog)!;
    const before = cycle.proposals.length;
    const proposal = makeProposal({ cycle_id: cycle.id });
    proposeItem(ASOC, cycle.id, proposal, null);
    const after = activeCycle(budgetForAsociatie(useBudgetStore.getState().byAsociatie, ASOC));
    expect(after!.proposals).toHaveLength(before + 1);
    expect(after!.proposals.find((p) => p.id === proposal.id)).toBeDefined();
  });

  it('stores the correct title and cost', () => {
    const cycle = activeCycle(budgetForAsociatie(useBudgetStore.getState().byAsociatie, ASOC))!;
    const proposal = makeProposal({ cycle_id: cycle.id, title: 'Copaci noi', cost: 900 });
    proposeItem(ASOC, cycle.id, proposal, null);
    const found = activeCycle(budgetForAsociatie(useBudgetStore.getState().byAsociatie, ASOC))!
      .proposals.find((p) => p.id === proposal.id);
    expect(found?.title).toBe('Copaci noi');
    expect(found?.cost).toBe(900);
  });
});

describe('castBudgetVote', () => {
  it('increments the vote count and sets voted=true', () => {
    const cycle = activeCycle(budgetForAsociatie(useBudgetStore.getState().byAsociatie, ASOC))!;
    const target = cycle.proposals[0];
    const before = target.votes;
    castBudgetVote(ASOC, cycle.id, target.id, null);
    const after = activeCycle(budgetForAsociatie(useBudgetStore.getState().byAsociatie, ASOC))!
      .proposals.find((p) => p.id === target.id);
    expect(after?.votes).toBe(before + 1);
    expect(after?.voted).toBe(true);
  });

  it('toggling twice restores the original count', () => {
    const cycle = activeCycle(budgetForAsociatie(useBudgetStore.getState().byAsociatie, ASOC))!;
    const target = cycle.proposals[0];
    const before = target.votes;
    castBudgetVote(ASOC, cycle.id, target.id, null);
    castBudgetVote(ASOC, cycle.id, target.id, null);
    const after = activeCycle(budgetForAsociatie(useBudgetStore.getState().byAsociatie, ASOC))!
      .proposals.find((p) => p.id === target.id);
    expect(after?.votes).toBe(before);
    expect(after?.voted).toBe(false);
  });
});
