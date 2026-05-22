import { create } from 'zustand';
import type { ProjectStatus } from '@/shared/types/domain';
import type { Project } from '@/shared/types/domain';
import { DEMO_PROJECTS } from '@/shared/demo/demoData';
import { nextPhaseStatus } from './projectsLogic';

interface ProjectsState {
  projects: Project[];
  addProject: (title: string, description: string, contractor: string, budgetAllocated: number) => void;
  setStatus: (id: string, status: ProjectStatus) => void;
  advancePhase: (projectId: string, phaseId: string) => void;
}

export const useProjectsStore = create<ProjectsState>((set) => ({
  projects: DEMO_PROJECTS.map((p) => ({ ...p, phases: p.phases.map((ph) => ({ ...ph })) })),
  addProject: (title, description, contractor, budgetAllocated) =>
    set((s) => ({
      projects: [
        ...s.projects,
        {
          id: `pr-${Date.now()}`,
          asociatie_id: 'demo-asoc',
          title,
          description,
          contractor,
          status: 'planificat',
          budget_allocated: budgetAllocated,
          budget_spent: 0,
          phases: [],
          created_at: new Date().toISOString(),
        },
      ],
    })),
  setStatus: (id, status) =>
    set((s) => ({
      projects: s.projects.map((p) => (p.id === id ? { ...p, status } : p)),
    })),
  advancePhase: (projectId, phaseId) =>
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              phases: p.phases.map((ph) =>
                ph.id === phaseId ? { ...ph, status: nextPhaseStatus(ph.status) } : ph,
              ),
            }
          : p,
      ),
    })),
}));
