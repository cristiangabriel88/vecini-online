import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { KeyRecord } from '@/shared/types/domain';
import { useAuthStore } from '@/shared/store/authStore';
import {
  type KeysByAsociatie,
  keysForAsociatie,
  seedKeys,
  addKeyIn,
  handoverKeyIn,
  migrateKeysState,
} from './keysLogic';

interface KeysState {
  byAsociatie: KeysByAsociatie;
  fetchError: string | null;
  addKey: (asociatieId: string, key: KeyRecord) => void;
  handover: (asociatieId: string, id: string, newHolder: string) => void;
  replaceForAsociatie: (asociatieId: string, keys: KeyRecord[]) => void;
  setFetchError: (msg: string | null) => void;
}

export const useKeysStore = create<KeysState>()(
  persist(
    (set) => ({
      byAsociatie: seedKeys(),
      fetchError: null,

      addKey: (asociatieId, key) =>
        set((s) => ({ byAsociatie: addKeyIn(s.byAsociatie, asociatieId, key) })),

      handover: (asociatieId, id, newHolder) =>
        set((s) => ({ byAsociatie: handoverKeyIn(s.byAsociatie, asociatieId, id, newHolder) })),

      replaceForAsociatie: (asociatieId, keys) =>
        set((s) => ({ byAsociatie: { ...s.byAsociatie, [asociatieId]: keys } })),

      setFetchError: (msg) => set({ fetchError: msg }),
    }),
    {
      name: 'vecini.keys',
      version: 1,
      partialize: (s) => ({ byAsociatie: s.byAsociatie }),
      migrate: (persisted) => ({ byAsociatie: migrateKeysState(persisted) }),
    },
  ),
);

export function useAsociatieKeys(): KeyRecord[] {
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  return useKeysStore((s) => keysForAsociatie(s.byAsociatie, asociatieId));
}
