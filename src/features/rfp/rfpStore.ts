import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Rfp, RfpQuote } from '@/shared/types/domain';
import { useAuthStore } from '@/shared/store/authStore';
import {
  type RfpsByAsociatie,
  seedRfps,
  rfpsForAsociatie,
  addRfpIn,
  addQuoteIn,
  decideRfpIn,
  migrateRfpsState,
} from './rfpLogic';

interface RfpState {
  byAsociatie: RfpsByAsociatie;
  fetchError: string | null;
  addRfp: (asociatieId: string, rfp: Rfp) => void;
  addQuote: (asociatieId: string, rfpId: string, quote: RfpQuote) => void;
  decide: (asociatieId: string, rfpId: string, quoteId: string) => void;
  replaceForAsociatie: (asociatieId: string, rfps: Rfp[]) => void;
  setFetchError: (msg: string | null) => void;
}

export const useRfpStore = create<RfpState>()(
  persist(
    (set) => ({
      byAsociatie: seedRfps(),
      fetchError: null,

      addRfp: (asociatieId, rfp) =>
        set((s) => ({ byAsociatie: addRfpIn(s.byAsociatie, asociatieId, rfp) })),

      addQuote: (asociatieId, rfpId, quote) =>
        set((s) => ({ byAsociatie: addQuoteIn(s.byAsociatie, asociatieId, rfpId, quote) })),

      decide: (asociatieId, rfpId, quoteId) =>
        set((s) => ({ byAsociatie: decideRfpIn(s.byAsociatie, asociatieId, rfpId, quoteId) })),

      replaceForAsociatie: (asociatieId, rfps) =>
        set((s) => ({ byAsociatie: { ...s.byAsociatie, [asociatieId]: rfps } })),

      setFetchError: (msg) => set({ fetchError: msg }),
    }),
    {
      name: 'vecini.rfps',
      version: 1,
      partialize: (s) => ({ byAsociatie: s.byAsociatie }),
      migrate: (persisted) => ({ byAsociatie: migrateRfpsState(persisted) }),
    },
  ),
);

export function useAsociatieRfps(): Rfp[] {
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  return useRfpStore((s) => rfpsForAsociatie(s.byAsociatie, asociatieId));
}
