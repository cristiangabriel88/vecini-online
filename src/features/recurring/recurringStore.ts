import { create } from 'zustand';

/* F21 keeps no domain data of its own — issues are computed from tickets.
   The only state worth holding is which detected patterns the comitet has
   already acknowledged ("known"), so they drop out of the active list. */
interface RecurringState {
  acknowledged: string[];
  isAcknowledged: (key: string) => boolean;
  toggleAck: (key: string) => void;
}

export const useRecurringStore = create<RecurringState>((set, get) => ({
  acknowledged: [],
  isAcknowledged: (key) => get().acknowledged.includes(key),
  toggleAck: (key) =>
    set((s) => ({
      acknowledged: s.acknowledged.includes(key)
        ? s.acknowledged.filter((k) => k !== key)
        : [...s.acknowledged, key],
    })),
}));
