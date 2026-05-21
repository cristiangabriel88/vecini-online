import { create } from 'zustand';
import type { InsurancePolicy } from '@/shared/types/domain';
import { DEMO_INSURANCE } from '@/shared/demo/demoData';

interface NewPolicy {
  insurer: string;
  policyNumber: string;
  expiresAt: string;
}

interface InsuranceState {
  policies: InsurancePolicy[];
  add: (input: NewPolicy) => void;
}

export const useInsuranceStore = create<InsuranceState>((set) => ({
  policies: [...DEMO_INSURANCE],
  add: ({ insurer, policyNumber, expiresAt }) =>
    set((s) => ({
      policies: [
        {
          id: `ins-${Date.now()}`,
          asociatie_id: 'demo-asoc',
          insurer: insurer.trim(),
          policy_number: policyNumber.trim(),
          expires_at: expiresAt,
          document_path: null,
        },
        ...s.policies,
      ],
    })),
}));
