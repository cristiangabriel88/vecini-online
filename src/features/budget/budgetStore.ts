import { create } from 'zustand';
import type { BudgetCycle } from '@/shared/types/domain';
import { DEMO_BUDGET_CYCLE } from '@/shared/demo/demoData';

interface BudgetState {
  cycle: BudgetCycle;
  addProposal: (title: string, cost: number, author: string) => void;
  toggleVote: (proposalId: string) => void;
}

export const useBudgetStore = create<BudgetState>((set) => ({
  cycle: { ...DEMO_BUDGET_CYCLE, proposals: [...DEMO_BUDGET_CYCLE.proposals] },
  addProposal: (title, cost, author) =>
    set((s) => ({
      cycle: {
        ...s.cycle,
        proposals: [
          ...s.cycle.proposals,
          {
            id: `bp-${Date.now()}`,
            cycle_id: s.cycle.id,
            title: title.trim(),
            cost,
            author_name: author,
            votes: 0,
            voted: false,
          },
        ],
      },
    })),
  toggleVote: (proposalId) =>
    set((s) => ({
      cycle: {
        ...s.cycle,
        proposals: s.cycle.proposals.map((p) =>
          p.id === proposalId
            ? { ...p, voted: !p.voted, votes: p.votes + (p.voted ? -1 : 1) }
            : p,
        ),
      },
    })),
}));
