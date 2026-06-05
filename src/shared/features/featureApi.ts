import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { useFeatureStore } from './featureStore';
import type { FeatureFlags } from './featureFlagsLogic';
import { useFeatureOverridesStore } from './featureOverridesStore';
import type { FeatureOverrides } from './featureOverridesLogic';

type FeatureRow = { feature_key: string; enabled: boolean };

/**
 * Hydrate the store for one asociatie from `asociatie_features` when Supabase
 * is configured. Replaces the entire flag set for that asociatie so the local
 * persisted state and the DB stay in sync. No-op offline -- the persisted store
 * remains the source of truth in demo/local mode.
 */
export async function hydrateFeatureFlags(asociatieId: string): Promise<void> {
  if (!isSupabaseConfigured || !asociatieId) return;
  try {
    const { data, error } = await supabase
      .from('asociatie_features')
      .select('feature_key, enabled')
      .eq('asociatie_id', asociatieId);
    if (error || !data) return;
    const flags: FeatureFlags = {};
    for (const row of data as FeatureRow[]) {
      flags[row.feature_key] = row.enabled;
    }
    useFeatureStore.getState().setAll(asociatieId, flags);
  } catch {
    /* best-effort: local persisted flags remain */
  }
}

/**
 * Hydrate per-tenant platform overrides from `asociatie_feature_overrides`
 * when Supabase is configured. Replaces the override map for that asociatie so
 * any platform-forced on/off states take effect immediately. No-op offline.
 */
export async function hydrateFeatureOverrides(asociatieId: string): Promise<void> {
  if (!isSupabaseConfigured || !asociatieId) return;
  try {
    const { data, error } = await supabase
      .from('asociatie_feature_overrides')
      .select('feature_key, override_enabled')
      .eq('asociatie_id', asociatieId);
    if (error || !data) return;
    const overrides: FeatureOverrides = {};
    for (const row of data as { feature_key: string; override_enabled: boolean }[]) {
      overrides[row.feature_key] = row.override_enabled;
    }
    useFeatureOverridesStore.getState().replaceForAsociatie(asociatieId, overrides);
  } catch {
    /* best-effort: local persisted overrides remain */
  }
}

/**
 * Toggle a feature flag in the store and mirror the change to `asociatie_features`
 * via an upsert when Supabase is configured. The store update is synchronous; the
 * DB upsert is best-effort (a network failure leaves the local toggle intact).
 */
export function setFeatureFlagLive(
  asociatieId: string,
  featureKey: string,
  enabled: boolean,
): void {
  useFeatureStore.getState().setFlag(asociatieId, featureKey, enabled);
  if (!isSupabaseConfigured) return;
  void (async () => {
    try {
      await supabase
        .from('asociatie_features')
        .upsert(
          { asociatie_id: asociatieId, feature_key: featureKey, enabled },
          { onConflict: 'asociatie_id,feature_key' },
        );
    } catch {
      /* best-effort: local toggle remains */
    }
  })();
}
