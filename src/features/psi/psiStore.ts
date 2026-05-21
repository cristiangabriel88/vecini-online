import { create } from 'zustand';
import type { PsiAsset } from '@/shared/types/domain';
import { DEMO_PSI_ASSETS } from '@/shared/demo/demoData';

interface NewAsset {
  asset: string;
  kind: string;
  location: string;
  nextCheck: string;
}

interface PsiState {
  assets: PsiAsset[];
  add: (input: NewAsset) => void;
  /** Record a check today and push the next check forward by `days`. */
  markChecked: (id: string, rollForwardDays: number) => void;
}

export const usePsiStore = create<PsiState>((set) => ({
  assets: [...DEMO_PSI_ASSETS],
  add: ({ asset, kind, location, nextCheck }) =>
    set((s) => ({
      assets: [
        {
          id: `psi-${Date.now()}`,
          asociatie_id: 'demo-asoc',
          asset: asset.trim(),
          kind: kind.trim() || 'Altele',
          location: location.trim() || null,
          next_check: nextCheck,
        },
        ...s.assets,
      ],
    })),
  markChecked: (id, rollForwardDays) =>
    set((s) => ({
      assets: s.assets.map((a) =>
        a.id === id
          ? { ...a, next_check: new Date(Date.now() + rollForwardDays * 86_400_000).toISOString().slice(0, 10) }
          : a,
      ),
    })),
}));
