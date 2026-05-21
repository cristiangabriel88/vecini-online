import { create } from 'zustand';
import type { Crowdfund } from '@/shared/types/domain';
import { DEMO_CROWDFUNDS } from '@/shared/demo/demoData';

interface NewCrowdfund {
  title: string;
  description: string;
  target: number;
  deadline: string;
}

interface CrowdfundState {
  funds: Crowdfund[];
  pledged: string[];
  create: (input: NewCrowdfund) => void;
  /** Record the current user's pledge once per crowdfund. */
  pledge: (id: string, amount: number) => void;
}

export const useCrowdfundStore = create<CrowdfundState>((set, get) => ({
  funds: [...DEMO_CROWDFUNDS],
  pledged: [],
  create: ({ title, description, target, deadline }) =>
    set((s) => ({
      funds: [
        {
          id: `cf-${Date.now()}`,
          asociatie_id: 'demo-asoc',
          title: title.trim(),
          description: description.trim(),
          target_amount: target,
          deadline,
          created_at: new Date().toISOString(),
          pledged: 0,
        },
        ...s.funds,
      ],
    })),
  pledge: (id, amount) => {
    if (get().pledged.includes(id)) return;
    set((s) => ({
      pledged: [...s.pledged, id],
      funds: s.funds.map((c) => (c.id === id ? { ...c, pledged: c.pledged + amount } : c)),
    }));
  },
}));
