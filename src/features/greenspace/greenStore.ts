import { create } from 'zustand';
import type { GreenTask } from '@/shared/types/domain';
import { DEMO_GREEN_TASKS } from '@/shared/demo/demoData';

/** Demo identity of the signed-in resident. */
export const DEMO_USER = { id: 'u-res', name: 'Popescu Andrei' };

interface GreenState {
  tasks: GreenTask[];
  add: (title: string, weekStart: string) => void;
  signUp: (id: string) => void;
  release: (id: string) => void;
}

export const useGreenStore = create<GreenState>((set) => ({
  tasks: [...DEMO_GREEN_TASKS],
  add: (title, weekStart) =>
    set((s) => ({
      tasks: [
        {
          id: `gt-${Date.now()}`,
          asociatie_id: 'demo-asoc',
          title: title.trim(),
          week_start: weekStart,
          volunteer_user_id: null,
          volunteer_name: null,
        },
        ...s.tasks,
      ],
    })),
  signUp: (id) =>
    set((s) => ({
      tasks: s.tasks.map((tk) =>
        tk.id === id
          ? { ...tk, volunteer_user_id: DEMO_USER.id, volunteer_name: DEMO_USER.name }
          : tk,
      ),
    })),
  release: (id) =>
    set((s) => ({
      tasks: s.tasks.map((tk) =>
        tk.id === id ? { ...tk, volunteer_user_id: null, volunteer_name: null } : tk,
      ),
    })),
}));
