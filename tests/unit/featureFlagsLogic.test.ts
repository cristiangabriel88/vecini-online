import { describe, expect, it } from 'vitest';
import {
  flagsForAsociatie,
  isFeatureEnabled,
  migrateFlatFlags,
  seedFlags,
  setAllIn,
  setFlagIn,
} from '@/shared/features/featureFlagsLogic';
import { DEMO_ASOCIATIE, DEMO_FEATURES } from '@/shared/demo/demoData';

describe('featureFlagsLogic', () => {
  it('seeds the demo asociație with the recommended feature set', () => {
    const seed = seedFlags();
    expect(seed[DEMO_ASOCIATIE.id]).toEqual(DEMO_FEATURES);
  });

  it('returns the stored flags for a known asociație', () => {
    const seed = seedFlags();
    expect(flagsForAsociatie(seed, DEMO_ASOCIATIE.id)).toEqual(DEMO_FEATURES);
  });

  it('returns an empty (all-off) set for an unknown or null asociație', () => {
    const seed = seedFlags();
    expect(flagsForAsociatie(seed, 'asoc-unknown')).toEqual({});
    expect(flagsForAsociatie(seed, null)).toEqual({});
  });

  it('returns a stable reference for the empty default (no needless re-renders)', () => {
    const seed = seedFlags();
    expect(flagsForAsociatie(seed, 'x')).toBe(flagsForAsociatie(seed, 'y'));
    expect(flagsForAsociatie(seed, null)).toBe(flagsForAsociatie({}, null));
  });

  it('scopes flags per asociație: a toggle on one does not affect another', () => {
    let byAsociatie = seedFlags();
    byAsociatie = setFlagIn(byAsociatie, 'asoc-b', 'F01', true);
    byAsociatie = setFlagIn(byAsociatie, 'asoc-b', 'F01', false);
    expect(isFeatureEnabled(byAsociatie, 'asoc-b', 'F01')).toBe(false);
    // The demo asociație keeps its own (still enabled) F01.
    expect(isFeatureEnabled(byAsociatie, DEMO_ASOCIATIE.id, 'F01')).toBe(
      Boolean(DEMO_FEATURES['F01']),
    );
  });

  it('setFlagIn / setAllIn are pure: they return a new map without mutating', () => {
    const before = seedFlags();
    const snapshot = JSON.parse(JSON.stringify(before));
    const next = setFlagIn(before, 'asoc-c', 'F02', true);
    expect(next).not.toBe(before);
    expect(before).toEqual(snapshot);
    expect(isFeatureEnabled(next, 'asoc-c', 'F02')).toBe(true);

    const replaced = setAllIn(next, 'asoc-c', { F99: true });
    expect(replaced['asoc-c']).toEqual({ F99: true });
    expect(isFeatureEnabled(replaced, 'asoc-c', 'F02')).toBe(false);
  });

  it('migrates a pre-T43 flat flags map onto the demo asociație', () => {
    const migrated = migrateFlatFlags({ flags: { F01: true, F02: false } });
    expect(migrated[DEMO_ASOCIATIE.id]).toEqual({ F01: true, F02: false });
  });

  it('falls back to the seed when there is nothing to migrate', () => {
    expect(migrateFlatFlags(null)).toEqual(seedFlags());
    expect(migrateFlatFlags({})).toEqual(seedFlags());
    expect(migrateFlatFlags({ flags: undefined })).toEqual(seedFlags());
  });
});
