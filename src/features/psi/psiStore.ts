import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PsiAsset } from '@/shared/types/domain';
import { useAuthStore } from '@/shared/store/authStore';
import {
  type PsiByAsociatie,
  psiForAsociatie,
  seedPsiAssets,
  addPsiIn,
  markCheckedIn,
  migratePsiState,
} from './psiLogic';

interface PsiState {
  byAsociatie: PsiByAsociatie;
  fetchError: string | null;
  addAsset: (asociatieId: string, asset: PsiAsset) => void;
  markChecked: (asociatieId: string, id: string, rollForwardDays: number) => void;
  replaceForAsociatie: (asociatieId: string, assets: PsiAsset[]) => void;
  setFetchError: (msg: string | null) => void;
}

export const usePsiStore = create<PsiState>()(
  persist(
    (set) => ({
      byAsociatie: seedPsiAssets(),
      fetchError: null,

      addAsset: (asociatieId, asset) =>
        set((s) => ({ byAsociatie: addPsiIn(s.byAsociatie, asociatieId, asset) })),

      markChecked: (asociatieId, id, rollForwardDays) =>
        set((s) => ({ byAsociatie: markCheckedIn(s.byAsociatie, asociatieId, id, rollForwardDays) })),

      replaceForAsociatie: (asociatieId, assets) =>
        set((s) => ({ byAsociatie: { ...s.byAsociatie, [asociatieId]: assets } })),

      setFetchError: (msg) => set({ fetchError: msg }),
    }),
    {
      name: 'vecini.psi',
      version: 1,
      partialize: (s) => ({ byAsociatie: s.byAsociatie }),
      migrate: (persisted) => ({ byAsociatie: migratePsiState(persisted) }),
    },
  ),
);

export function useAsociatiePsiAssets(): PsiAsset[] {
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  return usePsiStore((s) => psiForAsociatie(s.byAsociatie, asociatieId));
}
