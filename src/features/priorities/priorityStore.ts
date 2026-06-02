import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PriorityProject } from '@/shared/types/domain';
import { useAuthStore } from '@/shared/store/authStore';
import {
  type PriorityCatalog,
  type PrioritiesByAsociatie,
  migratePrioritiesState,
  prioritiesForAsociatie,
  seedPriorities,
} from './priorityLogic';

interface PriorityState {
  /** Priority catalog per asociație, keyed by asociație id. */
  byAsociatie: PrioritiesByAsociatie;
  /** Non-null when the last live fetch failed; null in demo/offline or after success. */
  fetchError: string | null;
  /** Prepend a new project to one asociație's catalog. */
  addProject: (asociatieId: string, project: PriorityProject) => void;
  /** Replace one asociație's ordered project list (after DnD or keyboard reorder). */
  reorderProjects: (asociatieId: string, projects: PriorityProject[]) => void;
  /** Replace one asociație's full catalog (used by live hydration). */
  replaceForAsociatie: (asociatieId: string, projects: PriorityProject[]) => void;
  /** Set or clear the live-fetch error. */
  setFetchError: (msg: string | null) => void;
  /** The priority catalog for one asociație (stable reference). */
  forAsociatie: (asociatieId: string | null) => PriorityCatalog;
}

/**
 * Project-priorities (F13) scoped per asociație (T193): the demo asociație is
 * seeded so the offline app is populated. Persisted so a reordering survives
 * reload; version bump reseeds the demo asociație from DEMO_PRIORITIES.
 * Live read/write against `project_priorities`/`priority_rankings` under RLS
 * is in `priorityApi.ts`; this module stays the synchronous source of truth.
 */
export const usePriorityStore = create<PriorityState>()(
  persist(
    (set, get) => ({
      byAsociatie: seedPriorities(),
      fetchError: null,

      addProject: (asociatieId, project) =>
        set((s) => {
          const catalog = prioritiesForAsociatie(s.byAsociatie, asociatieId);
          return {
            byAsociatie: {
              ...s.byAsociatie,
              [asociatieId]: { projects: [...catalog.projects, project] },
            },
          };
        }),

      reorderProjects: (asociatieId, projects) =>
        set((s) => ({
          byAsociatie: { ...s.byAsociatie, [asociatieId]: { projects } },
        })),

      replaceForAsociatie: (asociatieId, projects) =>
        set((s) => ({
          byAsociatie: { ...s.byAsociatie, [asociatieId]: { projects } },
        })),

      setFetchError: (msg) => set({ fetchError: msg }),

      forAsociatie: (asociatieId) => prioritiesForAsociatie(get().byAsociatie, asociatieId),
    }),
    {
      name: 'vecini.priorities',
      version: 1,
      partialize: (s) => ({ byAsociatie: s.byAsociatie }),
      migrate: (persisted) => ({ byAsociatie: migratePrioritiesState(persisted) }),
    },
  ),
);

/** Hook: the priority catalog for the currently active asociație. */
export function useAsociatiePriorities(): PriorityCatalog {
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  return usePriorityStore((s) => prioritiesForAsociatie(s.byAsociatie, asociatieId));
}
