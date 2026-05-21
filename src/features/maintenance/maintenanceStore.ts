import { create } from 'zustand';
import type { ScheduledMaintenance } from '@/shared/types/domain';
import { DEMO_MAINTENANCE } from '@/shared/demo/demoData';

interface NewMaintenance {
  title: string;
  vendor: string;
  recurrence: string;
  nextDue: string;
  notes: string;
}

interface MaintenanceState {
  items: ScheduledMaintenance[];
  add: (input: NewMaintenance) => void;
  /** Mark an entry done today and roll its next-due date forward by `days`. */
  markDone: (id: string, rollForwardDays: number) => void;
}

export const useMaintenanceStore = create<MaintenanceState>((set) => ({
  items: [...DEMO_MAINTENANCE],
  add: ({ title, vendor, recurrence, nextDue, notes }) =>
    set((s) => ({
      items: [
        {
          id: `sm-${Date.now()}`,
          asociatie_id: 'demo-asoc',
          title: title.trim(),
          vendor: vendor.trim() || null,
          recurrence: recurrence.trim() || 'O singură dată',
          last_done: null,
          next_due: nextDue,
          notes: notes.trim() || null,
        },
        ...s.items,
      ],
    })),
  markDone: (id, rollForwardDays) =>
    set((s) => ({
      items: s.items.map((m) => {
        if (m.id !== id) return m;
        const today = new Date().toISOString().slice(0, 10);
        const next = new Date(Date.now() + rollForwardDays * 86_400_000)
          .toISOString()
          .slice(0, 10);
        return { ...m, last_done: today, next_due: next };
      }),
    })),
}));
