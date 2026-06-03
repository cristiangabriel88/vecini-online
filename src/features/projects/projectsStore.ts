import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Project, ProjectStatus } from '@/shared/types/domain';
import { useAuthStore } from '@/shared/store/authStore';
import {
  type ProjectsByAsociatie,
  seedProjects,
  projectsForAsociatie,
  addProjectIn,
  migrateProjectsState,
  nextPhaseStatus,
} from './projectsLogic';

interface ProjectsState {
  byAsociatie: ProjectsByAsociatie;
  fetchError: string | null;
  addProject: (asociatieId: string, project: Project) => void;
  setStatus: (asociatieId: string, id: string, status: ProjectStatus) => void;
  advancePhase: (asociatieId: string, projectId: string, phaseId: string) => void;
  replaceForAsociatie: (asociatieId: string, projects: Project[]) => void;
  setFetchError: (msg: string | null) => void;
}

export const useProjectsStore = create<ProjectsState>()(
  persist(
    (set) => ({
      byAsociatie: seedProjects(),
      fetchError: null,

      addProject: (asociatieId, project) =>
        set((s) => ({ byAsociatie: addProjectIn(s.byAsociatie, asociatieId, project) })),

      setStatus: (asociatieId, id, status) =>
        set((s) => {
          const list = s.byAsociatie[asociatieId] ?? [];
          return {
            byAsociatie: {
              ...s.byAsociatie,
              [asociatieId]: list.map((p) => (p.id === id ? { ...p, status } : p)),
            },
          };
        }),

      advancePhase: (asociatieId, projectId, phaseId) =>
        set((s) => {
          const list = s.byAsociatie[asociatieId] ?? [];
          return {
            byAsociatie: {
              ...s.byAsociatie,
              [asociatieId]: list.map((p) =>
                p.id === projectId
                  ? {
                      ...p,
                      phases: p.phases.map((ph) =>
                        ph.id === phaseId
                          ? { ...ph, status: nextPhaseStatus(ph.status) }
                          : ph,
                      ),
                    }
                  : p,
              ),
            },
          };
        }),

      replaceForAsociatie: (asociatieId, projects) =>
        set((s) => ({ byAsociatie: { ...s.byAsociatie, [asociatieId]: projects } })),

      setFetchError: (msg) => set({ fetchError: msg }),
    }),
    {
      name: 'vecini.projects',
      version: 1,
      partialize: (s) => ({ byAsociatie: s.byAsociatie }),
      migrate: (persisted) => ({ byAsociatie: migrateProjectsState(persisted) }),
    },
  ),
);

export function useAsociatieProjects(): Project[] {
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  return useProjectsStore((s) => projectsForAsociatie(s.byAsociatie, asociatieId));
}
