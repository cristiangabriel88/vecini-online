import { describe, expect, it, beforeEach } from 'vitest';
import { useFeatureOverridesStore } from '@/shared/features/featureOverridesStore';

const ID = 'asoc-test';

beforeEach(() => {
  useFeatureOverridesStore.setState({ byAsociatie: {} });
});

describe('featureOverridesStore', () => {
  it('starts with an empty override map', () => {
    expect(useFeatureOverridesStore.getState().overridesFor(ID)).toEqual({});
  });

  it('setOverride adds an entry', () => {
    useFeatureOverridesStore.getState().setOverride(ID, 'F01', true);
    expect(useFeatureOverridesStore.getState().overridesFor(ID)).toEqual({ F01: true });
  });

  it('setOverride overwrites a previous value', () => {
    useFeatureOverridesStore.getState().setOverride(ID, 'F01', true);
    useFeatureOverridesStore.getState().setOverride(ID, 'F01', false);
    expect(useFeatureOverridesStore.getState().overridesFor(ID)['F01']).toBe(false);
  });

  it('clearOverride removes the entry', () => {
    useFeatureOverridesStore.getState().setOverride(ID, 'F01', true);
    useFeatureOverridesStore.getState().clearOverride(ID, 'F01');
    expect(useFeatureOverridesStore.getState().overridesFor(ID)).toEqual({});
  });

  it('replaceForAsociatie replaces the entire override map', () => {
    useFeatureOverridesStore.getState().setOverride(ID, 'F01', true);
    useFeatureOverridesStore.getState().replaceForAsociatie(ID, { F02: false });
    expect(useFeatureOverridesStore.getState().overridesFor(ID)).toEqual({ F02: false });
  });

  it('scopes overrides per asociatie', () => {
    useFeatureOverridesStore.getState().setOverride('asoc-1', 'F01', true);
    useFeatureOverridesStore.getState().setOverride('asoc-2', 'F01', false);
    expect(useFeatureOverridesStore.getState().overridesFor('asoc-1')['F01']).toBe(true);
    expect(useFeatureOverridesStore.getState().overridesFor('asoc-2')['F01']).toBe(false);
  });
});
