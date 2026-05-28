// featureApi offline-path tests (T56).
// Live-path tests require a real Supabase backend; CI exercises the offline path
// (isSupabaseConfigured === false). Key contracts:
//   - hydrateFeatureFlags: no-op when not configured (store untouched)
//   - setFeatureFlagLive: updates store synchronously in all modes
import { beforeEach, describe, expect, it } from 'vitest';
import { useFeatureStore } from '@/shared/features/featureStore';
import { hydrateFeatureFlags, setFeatureFlagLive } from '@/shared/features/featureApi';

const ASOC = 'asoc-test';
const OTHER_ASOC = 'asoc-other';

beforeEach(() => {
  useFeatureStore.setState({
    byAsociatie: {
      [ASOC]: { F01: false, F02: true },
      [OTHER_ASOC]: { F01: true },
    },
  });
});

describe('hydrateFeatureFlags (offline)', () => {
  it('is a no-op when Supabase is not configured', async () => {
    const before = useFeatureStore.getState().byAsociatie[ASOC];
    await hydrateFeatureFlags(ASOC);
    expect(useFeatureStore.getState().byAsociatie[ASOC]).toBe(before);
  });

  it('is a no-op when asociatieId is empty', async () => {
    const before = useFeatureStore.getState().byAsociatie;
    await hydrateFeatureFlags('');
    expect(useFeatureStore.getState().byAsociatie).toBe(before);
  });
});

describe('setFeatureFlagLive', () => {
  it('enables a feature in the store', () => {
    setFeatureFlagLive(ASOC, 'F01', true);
    expect(useFeatureStore.getState().byAsociatie[ASOC]['F01']).toBe(true);
  });

  it('disables a feature in the store', () => {
    setFeatureFlagLive(ASOC, 'F02', false);
    expect(useFeatureStore.getState().byAsociatie[ASOC]['F02']).toBe(false);
  });

  it('does not affect another asociatie', () => {
    setFeatureFlagLive(ASOC, 'F01', true);
    expect(useFeatureStore.getState().byAsociatie[OTHER_ASOC]['F01']).toBe(true);
  });

  it('adds a new feature key to the asociatie flags', () => {
    setFeatureFlagLive(ASOC, 'F99', true);
    expect(useFeatureStore.getState().byAsociatie[ASOC]['F99']).toBe(true);
    // existing flags unaffected
    expect(useFeatureStore.getState().byAsociatie[ASOC]['F01']).toBe(false);
  });

  it('does not modify other features within the same asociatie', () => {
    setFeatureFlagLive(ASOC, 'F01', true);
    expect(useFeatureStore.getState().byAsociatie[ASOC]['F02']).toBe(true);
  });
});
