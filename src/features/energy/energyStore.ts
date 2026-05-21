import { create } from 'zustand';
import type { EnergyRecord } from '@/shared/types/domain';
import { DEMO_ENERGY } from '@/shared/demo/demoData';

interface NewRecord {
  period: string;
  kind: string;
  amount: number;
  cost: number;
}

interface EnergyState {
  records: EnergyRecord[];
  add: (input: NewRecord) => void;
}

export const useEnergyStore = create<EnergyState>((set) => ({
  records: [...DEMO_ENERGY],
  add: ({ period, kind, amount, cost }) =>
    set((s) => ({
      records: [
        {
          id: `en-${Date.now()}`,
          asociatie_id: 'demo-asoc',
          period,
          kind,
          amount,
          cost,
        },
        ...s.records,
      ],
    })),
}));
