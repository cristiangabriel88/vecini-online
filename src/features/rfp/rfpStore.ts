import { create } from 'zustand';
import type { Rfp } from '@/shared/types/domain';
import { DEMO_RFPS } from '@/shared/demo/demoData';

interface RfpState {
  rfps: Rfp[];
  addRfp: (input: { title: string; description: string }) => void;
  addQuote: (rfpId: string, contractor: string, amount: number) => void;
  decide: (rfpId: string, quoteId: string) => void;
}

export const useRfpStore = create<RfpState>((set) => ({
  rfps: [...DEMO_RFPS],
  addRfp: ({ title, description }) =>
    set((s) => ({
      rfps: [
        {
          id: `rfp-${Date.now()}`,
          asociatie_id: 'demo-asoc',
          title: title.trim(),
          description: description.trim(),
          status: 'deschis',
          created_at: new Date().toISOString(),
          quotes: [],
        },
        ...s.rfps,
      ],
    })),
  addQuote: (rfpId, contractor, amount) =>
    set((s) => ({
      rfps: s.rfps.map((r) =>
        r.id === rfpId
          ? {
              ...r,
              quotes: [
                ...r.quotes,
                { id: `q-${Date.now()}`, rfp_id: rfpId, contractor: contractor.trim(), amount, selected: false },
              ],
            }
          : r,
      ),
    })),
  decide: (rfpId, quoteId) =>
    set((s) => ({
      rfps: s.rfps.map((r) =>
        r.id === rfpId
          ? {
              ...r,
              status: 'decis',
              quotes: r.quotes.map((q) => ({ ...q, selected: q.id === quoteId })),
            }
          : r,
      ),
    })),
}));
