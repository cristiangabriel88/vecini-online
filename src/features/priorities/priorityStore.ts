import { create } from 'zustand';
import type { PriorityProject } from '@/shared/types/domain';
import { DEMO_PRIORITIES } from '@/shared/demo/demoData';
import { moveDown as moveDownLogic, moveUp as moveUpLogic } from './priorityLogic';

interface PriorityState {
  projects: PriorityProject[];
  add: (title: string, description: string) => void;
  moveUp: (id: string) => void;
  moveDown: (id: string) => void;
}

export const usePriorityStore = create<PriorityState>((set) => ({
  projects: [...DEMO_PRIORITIES],
  add: (title, description) =>
    set((s) => ({
      projects: [
        ...s.projects,
        {
          id: `pr-${Date.now()}`,
          asociatie_id: 'demo-asoc',
          title: title.trim(),
          description: description.trim(),
          rank: s.projects.length + 1,
        },
      ],
    })),
  moveUp: (id) => set((s) => ({ projects: moveUpLogic(s.projects, id) })),
  moveDown: (id) => set((s) => ({ projects: moveDownLogic(s.projects, id) })),
}));
