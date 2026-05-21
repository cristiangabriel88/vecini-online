import { create } from 'zustand';
import type { Contractor } from '@/shared/types/domain';
import { DEMO_CONTRACTORS } from '@/shared/demo/demoData';
import { applyRating } from './contractorLogic';

interface ContractorState {
  contractors: Contractor[];
  add: (input: { name: string; specialty: string; price_tier: string; contact: string }) => void;
  rate: (id: string, value: number) => void;
  toggleAvailable: (id: string) => void;
}

export const useContractorStore = create<ContractorState>((set) => ({
  contractors: [...DEMO_CONTRACTORS],
  add: ({ name, specialty, price_tier, contact }) =>
    set((s) => ({
      contractors: [
        {
          id: `ct-${Date.now()}`,
          asociatie_id: 'demo-asoc',
          name: name.trim(),
          specialty: specialty.trim(),
          price_tier: price_tier || 'mediu',
          contact: contact.trim(),
          last_used: null,
          available: true,
          rating: 0,
          rating_count: 0,
        },
        ...s.contractors,
      ],
    })),
  rate: (id, value) =>
    set((s) => ({
      contractors: s.contractors.map((c) => (c.id === id ? { ...c, ...applyRating(c, value) } : c)),
    })),
  toggleAvailable: (id) =>
    set((s) => ({
      contractors: s.contractors.map((c) =>
        c.id === id ? { ...c, available: !c.available } : c,
      ),
    })),
}));
