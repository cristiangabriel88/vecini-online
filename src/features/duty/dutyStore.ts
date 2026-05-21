import { create } from 'zustand';
import type { DutySlot } from '@/shared/types/domain';
import { DEMO_DUTY } from '@/shared/demo/demoData';

/** Demo identity of the signed-in resident. */
export const DEMO_USER = { id: 'u-res', name: 'Popescu Andrei' };

interface DutyState {
  slots: DutySlot[];
  signUp: (id: string, note: string) => void;
  release: (id: string) => void;
}

export const useDutyStore = create<DutyState>((set) => ({
  slots: [...DEMO_DUTY],
  signUp: (id, note) =>
    set((s) => ({
      slots: s.slots.map((slot) =>
        slot.id === id
          ? {
              ...slot,
              volunteer_user_id: DEMO_USER.id,
              volunteer_name: DEMO_USER.name,
              note: note.trim() || null,
            }
          : slot,
      ),
    })),
  release: (id) =>
    set((s) => ({
      slots: s.slots.map((slot) =>
        slot.id === id
          ? { ...slot, volunteer_user_id: null, volunteer_name: null, note: null }
          : slot,
      ),
    })),
}));
