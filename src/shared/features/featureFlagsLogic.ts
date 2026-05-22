import { DEMO_ASOCIATIE, DEMO_FEATURES } from '@/shared/demo/demoData';

/** Map of feature_key -> enabled, for a single asociație. */
export type FeatureFlags = Record<string, boolean>;

/** All asociații's flags, keyed by asociație id. */
export type FlagsByAsociatie = Record<string, FeatureFlags>;

/**
 * Stable empty map returned for an unknown asociație so React selectors keep a
 * constant reference (a fresh `{}` per call would force needless re-renders).
 * Never mutate it; the setters always build a new object.
 */
const EMPTY_FLAGS: FeatureFlags = Object.freeze({});

/**
 * Seed used the first time the store initialises (before any persisted state):
 * the demo asociație gets the recommended feature set so the offline app is
 * fully populated. Other asociații start empty until an admin enables modules.
 */
export function seedFlags(): FlagsByAsociatie {
  return { [DEMO_ASOCIATIE.id]: { ...DEMO_FEATURES } };
}

/**
 * The enabled set for one asociație. Returns the stored map (a stable
 * reference) or a shared frozen empty map when the asociație has no flags yet
 * or none is active. The empty default means every module is off for a brand
 * new asociație until its admin turns modules on.
 */
export function flagsForAsociatie(
  byAsociatie: FlagsByAsociatie,
  asociatieId: string | null,
): FeatureFlags {
  if (!asociatieId) return EMPTY_FLAGS;
  return byAsociatie[asociatieId] ?? EMPTY_FLAGS;
}

/** Is a feature enabled for the given asociație? */
export function isFeatureEnabled(
  byAsociatie: FlagsByAsociatie,
  asociatieId: string | null,
  key: string,
): boolean {
  return Boolean(flagsForAsociatie(byAsociatie, asociatieId)[key]);
}

/** Set a single flag for one asociație, returning a new `byAsociatie` map. */
export function setFlagIn(
  byAsociatie: FlagsByAsociatie,
  asociatieId: string,
  key: string,
  enabled: boolean,
): FlagsByAsociatie {
  return {
    ...byAsociatie,
    [asociatieId]: { ...(byAsociatie[asociatieId] ?? {}), [key]: enabled },
  };
}

/** Replace the entire flag set for one asociație, returning a new map. */
export function setAllIn(
  byAsociatie: FlagsByAsociatie,
  asociatieId: string,
  flags: FeatureFlags,
): FlagsByAsociatie {
  return { ...byAsociatie, [asociatieId]: { ...flags } };
}

/**
 * Migrate a pre-T43 persisted state (a single flat `flags` map shared across
 * asociații) into the per-asociație shape, attributing the old flags to the
 * demo asociație. Returns the seeded shape when there is nothing to carry over.
 */
export function migrateFlatFlags(persisted: unknown): FlagsByAsociatie {
  const flat = (persisted as { flags?: unknown } | null)?.flags;
  if (flat && typeof flat === 'object') {
    return { [DEMO_ASOCIATIE.id]: { ...(flat as FeatureFlags) } };
  }
  return seedFlags();
}
