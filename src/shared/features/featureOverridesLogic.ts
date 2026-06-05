/** Per-tenant feature-flag overrides set by platform operators (T256). */

/** Map of feature_key -> forced enabled value, for a single asociatie. */
export type FeatureOverrides = Record<string, boolean>;

/** All asociatii's overrides, keyed by asociatie id. */
export type OverridesByAsociatie = Record<string, FeatureOverrides>;

const EMPTY_OVERRIDES: FeatureOverrides = Object.freeze({});

/** Returns the overrides map for one asociatie (stable empty ref when absent). */
export function overridesForAsociatie(
  byAsociatie: OverridesByAsociatie,
  asociatieId: string | null,
): FeatureOverrides {
  if (!asociatieId) return EMPTY_OVERRIDES;
  return byAsociatie[asociatieId] ?? EMPTY_OVERRIDES;
}

/**
 * Merge base flags with overrides: an override entry wins unconditionally,
 * whether it forces the feature on or off.
 */
export function applyOverrides(
  flags: Record<string, boolean>,
  overrides: FeatureOverrides,
): Record<string, boolean> {
  if (Object.keys(overrides).length === 0) return flags;
  return { ...flags, ...overrides };
}

/** Set one override for one asociatie, returning a new map (pure). */
export function setOverrideIn(
  byAsociatie: OverridesByAsociatie,
  asociatieId: string,
  key: string,
  enabled: boolean,
): OverridesByAsociatie {
  return {
    ...byAsociatie,
    [asociatieId]: { ...(byAsociatie[asociatieId] ?? {}), [key]: enabled },
  };
}

/** Remove one override for one asociatie, returning a new map (pure). */
export function clearOverrideIn(
  byAsociatie: OverridesByAsociatie,
  asociatieId: string,
  key: string,
): OverridesByAsociatie {
  const current = byAsociatie[asociatieId];
  if (!current || !(key in current)) return byAsociatie;
  const next = { ...current };
  delete next[key];
  return { ...byAsociatie, [asociatieId]: next };
}
