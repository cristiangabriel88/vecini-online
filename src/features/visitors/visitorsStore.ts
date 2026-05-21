import { create } from 'zustand';
import type { VisitorReport } from '@/shared/types/domain';
import { DEMO_VISITOR_REPORTS } from '@/shared/demo/demoData';
import { nextStatus } from './visitorLogic';

interface VisitorsState {
  reports: VisitorReport[];
  add: (note: string) => void;
  cycleStatus: (id: string) => void;
}

export const useVisitorsStore = create<VisitorsState>((set) => ({
  reports: [...DEMO_VISITOR_REPORTS],
  add: (note) =>
    set((s) => ({
      reports: [
        {
          id: `vr-${Date.now()}`,
          asociatie_id: 'demo-asoc',
          reporter_user_id: 'u-res',
          reporter_name: 'Popescu Andrei',
          note: note.trim(),
          photo_path: null,
          status: 'nou',
          created_at: new Date().toISOString(),
        },
        ...s.reports,
      ],
    })),
  cycleStatus: (id) =>
    set((s) => ({
      reports: s.reports.map((r) => (r.id === id ? { ...r, status: nextStatus(r.status) } : r)),
    })),
}));
