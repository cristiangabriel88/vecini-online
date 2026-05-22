import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  type ConsentChoices,
  type ConsentRecord,
  acceptAllChoices,
  makeRecord,
  rejectNonEssentialChoices,
} from '@/features/legal/consentLogic';

interface ConsentState {
  /** The active decision, or null until the resident chooses. */
  record: ConsentRecord | null;
  /**
   * Append-only local log of decisions — the "who consented to what, when,
   * version" trail. With a backend it mirrors to the `consent_records` table;
   * offline it lives here so the demo and audit surface still work.
   */
  history: ConsentRecord[];
  decide: (choices: ConsentChoices) => void;
  acceptAll: () => void;
  rejectNonEssential: () => void;
  /** Forget the decision so the banner shows again (used by "withdraw"). */
  reset: () => void;
}

export const useConsentStore = create<ConsentState>()(
  persist(
    (set, get) => ({
      record: null,
      history: [],
      decide: (choices) => {
        const record = makeRecord(choices);
        set({ record, history: [...get().history, record] });
      },
      acceptAll: () => get().decide(acceptAllChoices()),
      rejectNonEssential: () => get().decide(rejectNonEssentialChoices()),
      reset: () => set({ record: null }),
    }),
    { name: 'intrevecini.consent' },
  ),
);
