import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEMO_FEATURES } from '@/shared/demo/demoData';

interface FeatureState {
  /** map of feature_key -> enabled */
  flags: Record<string, boolean>;
  setFlag: (key: string, enabled: boolean) => void;
  setAll: (flags: Record<string, boolean>) => void;
  isEnabled: (key: string) => boolean;
}

/**
 * Holds the current asociație's feature flags. Seeded from demo data and
 * persisted locally so admin toggles survive a refresh in demo mode. With a
 * real backend, `setAll` is populated from the `asociatie_features` table.
 */
export const useFeatureStore = create<FeatureState>()(
  persist(
    (set, get) => ({
      flags: { ...DEMO_FEATURES },
      setFlag: (key, enabled) => set((s) => ({ flags: { ...s.flags, [key]: enabled } })),
      setAll: (flags) => set({ flags }),
      isEnabled: (key) => Boolean(get().flags[key]),
    }),
    { name: 'intrevecini.features' },
  ),
);

/** Hook: is a given feature enabled for the current asociație? */
export function useFeature(key: string): boolean {
  return useFeatureStore((s) => Boolean(s.flags[key]));
}
