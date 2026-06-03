import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DirectoryEntry } from '@/shared/types/domain';
import { useAuthStore } from '@/shared/store/authStore';
import { DEMO_MY_DIRECTORY } from '@/shared/demo/demoData';
import {
  type DirectoryByAsociatie,
  seedDirectory,
  directoryForAsociatie,
  toggleConsentIn,
  replaceDirectoryIn,
  migrateDirectoryState,
} from './directoryLogic';

type ConsentField = 'show_name' | 'show_apartment' | 'show_phone' | 'show_email';

interface DirectoryState {
  byAsociatie: DirectoryByAsociatie;
  myUserId: string;
  fetchError: string | null;
  toggle: (asociatieId: string, field: ConsentField) => void;
  replaceForAsociatie: (asociatieId: string, entries: DirectoryEntry[]) => void;
  setFetchError: (msg: string | null) => void;
}

export const useDirectoryStore = create<DirectoryState>()(
  persist(
    (set) => ({
      byAsociatie: seedDirectory(),
      myUserId: DEMO_MY_DIRECTORY.user_id,
      fetchError: null,

      toggle: (asociatieId, field) =>
        set((s) => ({
          byAsociatie: toggleConsentIn(s.byAsociatie, asociatieId, s.myUserId, field),
        })),

      replaceForAsociatie: (asociatieId, entries) =>
        set((s) => ({ byAsociatie: replaceDirectoryIn(s.byAsociatie, asociatieId, entries) })),

      setFetchError: (msg) => set({ fetchError: msg }),
    }),
    {
      name: 'vecini.directory',
      version: 1,
      partialize: (s) => ({ byAsociatie: s.byAsociatie }),
      migrate: (persisted) => ({ byAsociatie: migrateDirectoryState(persisted) }),
    },
  ),
);

export function useAsociatieDirectory(): DirectoryEntry[] {
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  return useDirectoryStore((s) => directoryForAsociatie(s.byAsociatie, asociatieId));
}
