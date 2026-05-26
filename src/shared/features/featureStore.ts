import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useAuthStore } from '@/shared/store/authStore';
import {
  type FeatureFlags,
  type FlagsByAsociatie,
  flagsForAsociatie,
  migrateFlatFlags,
  seedFlags,
  setAllIn,
  setFlagIn,
} from './featureFlagsLogic';

interface FeatureState {
  /** Enabled feature set per asociație, keyed by asociație id. */
  byAsociatie: FlagsByAsociatie;
  /** Toggle a single feature for one asociație. */
  setFlag: (asociatieId: string, key: string, enabled: boolean) => void;
  /** Replace the whole flag set for one asociație (e.g. onboarding). */
  setAll: (asociatieId: string, flags: FeatureFlags) => void;
  /** The enabled set for one asociație (stable reference). */
  flagsFor: (asociatieId: string | null) => FeatureFlags;
}

/**
 * Holds each asociație's feature flags, keyed by asociație id and persisted
 * locally so admin toggles survive a refresh and different local asociații can
 * enable different modules. Seeded from `DEMO_FEATURES` for the demo asociație.
 * With a real backend, an asociație's set is hydrated from / written back to
 * `asociatie_features` (live activation is T56). This per-asociație enabled set
 * is the single source for the nav and for route gating (T44).
 */
export const useFeatureStore = create<FeatureState>()(
  persist(
    (set, get) => ({
      byAsociatie: seedFlags(),
      setFlag: (asociatieId, key, enabled) =>
        set((s) => ({ byAsociatie: setFlagIn(s.byAsociatie, asociatieId, key, enabled) })),
      setAll: (asociatieId, flags) =>
        set((s) => ({ byAsociatie: setAllIn(s.byAsociatie, asociatieId, flags) })),
      flagsFor: (asociatieId) => flagsForAsociatie(get().byAsociatie, asociatieId),
    }),
    {
      name: 'vecini.features',
      version: 2,
      // v1 stored a single flat `flags` map shared across asociații; carry it
      // over to the demo asociație so an existing install keeps its toggles.
      migrate: (persisted) => ({ byAsociatie: migrateFlatFlags(persisted) }),
    },
  ),
);

/** Hook: the enabled flag set for the currently active asociație. */
export function useAsociatieFlags(): FeatureFlags {
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  return useFeatureStore((s) => flagsForAsociatie(s.byAsociatie, asociatieId));
}

/** Hook: is a given feature enabled for the active asociație? */
export function useFeature(key: string): boolean {
  const flags = useAsociatieFlags();
  return Boolean(flags[key]);
}
