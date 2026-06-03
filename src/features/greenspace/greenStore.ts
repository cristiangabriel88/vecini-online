import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GreenTask } from '@/shared/types/domain';
import { useAuthStore } from '@/shared/store/authStore';
import {
  type GreenByAsociatie,
  seedGreenTasks,
  greenForAsociatie,
  addGreenTaskIn,
  signUpIn,
  releaseIn,
  migrateGreenState,
} from './greenLogic';

interface GreenState {
  byAsociatie: GreenByAsociatie;
  fetchError: string | null;
  addTask: (asociatieId: string, task: GreenTask) => void;
  signUp: (asociatieId: string, taskId: string, userId: string, userName: string) => void;
  release: (asociatieId: string, taskId: string) => void;
  replaceForAsociatie: (asociatieId: string, tasks: GreenTask[]) => void;
  setFetchError: (msg: string | null) => void;
}

export const useGreenStore = create<GreenState>()(
  persist(
    (set) => ({
      byAsociatie: seedGreenTasks(),
      fetchError: null,

      addTask: (asociatieId, task) =>
        set((s) => ({ byAsociatie: addGreenTaskIn(s.byAsociatie, asociatieId, task) })),

      signUp: (asociatieId, taskId, userId, userName) =>
        set((s) => ({ byAsociatie: signUpIn(s.byAsociatie, asociatieId, taskId, userId, userName) })),

      release: (asociatieId, taskId) =>
        set((s) => ({ byAsociatie: releaseIn(s.byAsociatie, asociatieId, taskId) })),

      replaceForAsociatie: (asociatieId, tasks) =>
        set((s) => ({ byAsociatie: { ...s.byAsociatie, [asociatieId]: tasks } })),

      setFetchError: (msg) => set({ fetchError: msg }),
    }),
    {
      name: 'vecini.green',
      version: 1,
      partialize: (s) => ({ byAsociatie: s.byAsociatie }),
      migrate: (persisted) => ({ byAsociatie: migrateGreenState(persisted) }),
    },
  ),
);

export function useAsociatieGreenTasks(): GreenTask[] {
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  return useGreenStore((s) => greenForAsociatie(s.byAsociatie, asociatieId));
}
