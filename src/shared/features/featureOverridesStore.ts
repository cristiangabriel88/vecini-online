import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useAuthStore } from '@/shared/store/authStore';
import {
  type FeatureOverrides,
  type OverridesByAsociatie,
  overridesForAsociatie,
  setOverrideIn,
  clearOverrideIn,
} from './featureOverridesLogic';

interface FeatureOverridesState {
  /** Platform-set overrides per asociatie (keyed by asociatie id). */
  byAsociatie: OverridesByAsociatie;
  /** Force-enable or force-disable a feature for one asociatie. */
  setOverride: (asociatieId: string, key: string, enabled: boolean) => void;
  /** Remove a per-tenant override, restoring the admin-managed default. */
  clearOverride: (asociatieId: string, key: string) => void;
  /** Replace the entire override map for one asociatie (live hydration). */
  replaceForAsociatie: (asociatieId: string, overrides: FeatureOverrides) => void;
  /** Returns the overrides for one asociatie (stable ref). */
  overridesFor: (asociatieId: string | null) => FeatureOverrides;
}

/**
 * Persisted store for platform-operator feature-flag overrides (T256).
 * Shared between the platform console (writes) and the resident app (reads)
 * via the same localStorage key, so demo-mode toggling reflects immediately
 * in the running app without a backend round-trip.
 */
export const useFeatureOverridesStore = create<FeatureOverridesState>()(
  persist(
    (set, get) => ({
      byAsociatie: {},
      setOverride: (asociatieId, key, enabled) =>
        set((s) => ({ byAsociatie: setOverrideIn(s.byAsociatie, asociatieId, key, enabled) })),
      clearOverride: (asociatieId, key) =>
        set((s) => ({ byAsociatie: clearOverrideIn(s.byAsociatie, asociatieId, key) })),
      replaceForAsociatie: (asociatieId, overrides) =>
        set((s) => ({ byAsociatie: { ...s.byAsociatie, [asociatieId]: { ...overrides } } })),
      overridesFor: (asociatieId) => overridesForAsociatie(get().byAsociatie, asociatieId),
    }),
    {
      name: 'vecini.feature_overrides',
      version: 1,
    },
  ),
);

/** Hook: the override map for the currently active asociatie. */
export function useAsociatieOverrides(): FeatureOverrides {
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  return useFeatureOverridesStore((s) => overridesForAsociatie(s.byAsociatie, asociatieId));
}
