import { describe, expect, it } from 'vitest';
import {
  overridesForAsociatie,
  applyOverrides,
  setOverrideIn,
  clearOverrideIn,
} from '@/shared/features/featureOverridesLogic';

const ID_A = 'asoc-a';
const ID_B = 'asoc-b';

describe('overridesForAsociatie', () => {
  it('returns an empty stable ref for an unknown asociatie', () => {
    const by = {};
    expect(overridesForAsociatie(by, 'unknown')).toEqual({});
    expect(overridesForAsociatie(by, null)).toEqual({});
  });

  it('returns a stable empty ref across calls (no re-render churn)', () => {
    const by = {};
    expect(overridesForAsociatie(by, 'x')).toBe(overridesForAsociatie(by, 'y'));
  });

  it('returns the stored overrides for a known asociatie', () => {
    const by = { [ID_A]: { F01: true, F02: false } };
    expect(overridesForAsociatie(by, ID_A)).toEqual({ F01: true, F02: false });
  });
});

describe('applyOverrides', () => {
  it('returns the original flags map when there are no overrides', () => {
    const flags = { F01: true, F02: false };
    expect(applyOverrides(flags, {})).toBe(flags);
  });

  it('override true wins even when base flag is false', () => {
    const result = applyOverrides({ F01: false }, { F01: true });
    expect(result['F01']).toBe(true);
  });

  it('override false wins even when base flag is true', () => {
    const result = applyOverrides({ F01: true }, { F01: false });
    expect(result['F01']).toBe(false);
  });

  it('only overrides the specified keys; other base flags are untouched', () => {
    const result = applyOverrides({ F01: true, F02: true }, { F01: false });
    expect(result['F01']).toBe(false);
    expect(result['F02']).toBe(true);
  });

  it('an override can force-enable a feature not in the base flags', () => {
    const result = applyOverrides({}, { F99: true });
    expect(result['F99']).toBe(true);
  });
});

describe('setOverrideIn', () => {
  it('adds a new override for a new asociatie', () => {
    const by = setOverrideIn({}, ID_A, 'F01', true);
    expect(by[ID_A]).toEqual({ F01: true });
  });

  it('updates an existing override', () => {
    let by = setOverrideIn({}, ID_A, 'F01', true);
    by = setOverrideIn(by, ID_A, 'F01', false);
    expect(by[ID_A]['F01']).toBe(false);
  });

  it('is pure: does not mutate the input map', () => {
    const before = {};
    const snapshot = JSON.stringify(before);
    setOverrideIn(before, ID_A, 'F01', true);
    expect(JSON.stringify(before)).toBe(snapshot);
  });

  it('scopes overrides per asociatie', () => {
    let by = setOverrideIn({}, ID_A, 'F01', true);
    by = setOverrideIn(by, ID_B, 'F01', false);
    expect(by[ID_A]['F01']).toBe(true);
    expect(by[ID_B]['F01']).toBe(false);
  });
});

describe('clearOverrideIn', () => {
  it('removes a previously set override', () => {
    let by = setOverrideIn({}, ID_A, 'F01', true);
    by = clearOverrideIn(by, ID_A, 'F01');
    expect(by[ID_A]).toEqual({});
  });

  it('returns the same reference when there is nothing to clear', () => {
    const by = { [ID_A]: { F01: true } };
    expect(clearOverrideIn(by, ID_A, 'F99')).toBe(by);
    expect(clearOverrideIn(by, 'unknown', 'F01')).toBe(by);
  });

  it('does not affect overrides for other features', () => {
    let by = setOverrideIn({}, ID_A, 'F01', true);
    by = setOverrideIn(by, ID_A, 'F02', false);
    by = clearOverrideIn(by, ID_A, 'F01');
    expect(by[ID_A]).toEqual({ F02: false });
  });
});
