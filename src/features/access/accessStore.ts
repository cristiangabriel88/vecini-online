import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AccessCode } from '@/shared/types/domain';
import { useAuthStore } from '@/shared/store/authStore';
import {
  type AccessByAsociatie,
  seedAccessCodes,
  accessForAsociatie,
  addAccessCodeIn,
  migrateAccessState,
} from './accessLogic';

interface AccessState {
  byAsociatie: AccessByAsociatie;
  fetchError: string | null;
  addCode: (asociatieId: string, code: AccessCode) => void;
  replaceForAsociatie: (asociatieId: string, codes: AccessCode[]) => void;
  setFetchError: (msg: string | null) => void;
}

export const useAccessStore = create<AccessState>()(
  persist(
    (set) => ({
      byAsociatie: seedAccessCodes(),
      fetchError: null,

      addCode: (asociatieId, code) =>
        set((s) => ({ byAsociatie: addAccessCodeIn(s.byAsociatie, asociatieId, code) })),

      replaceForAsociatie: (asociatieId, codes) =>
        set((s) => ({ byAsociatie: { ...s.byAsociatie, [asociatieId]: codes } })),

      setFetchError: (msg) => set({ fetchError: msg }),
    }),
    {
      name: 'vecini.access',
      version: 1,
      partialize: (s) => ({ byAsociatie: s.byAsociatie }),
      migrate: (persisted) => ({ byAsociatie: migrateAccessState(persisted) }),
    },
  ),
);

export function useAsociatieAccessCodes(): AccessCode[] {
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  return useAccessStore((s) => accessForAsociatie(s.byAsociatie, asociatieId));
}
