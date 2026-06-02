import { describe, expect, it } from 'vitest';
import {
  fetchSurveyTally,
  fetchPollTally,
  fetchPollRankedTally,
  fetchPriorityTurnout,
} from '@/shared/lib/tallyApi';

// tallyApi offline-path tests (T80). Live-path tests require a real Supabase
// backend with the T38/T80 SECURITY DEFINER aggregates; CI exercises the offline
// path (isSupabaseConfigured === false), where every helper short-circuits to
// null so the caller keeps its client-side tally and demo mode stays working.

describe('tallyApi (offline / CI)', () => {
  it('fetchSurveyTally returns null when Supabase is not configured', async () => {
    expect(await fetchSurveyTally('survey-1')).toBeNull();
  });

  it('fetchPollTally returns null when Supabase is not configured', async () => {
    expect(await fetchPollTally('poll-1')).toBeNull();
  });

  it('fetchPollRankedTally returns null when Supabase is not configured', async () => {
    expect(await fetchPollRankedTally('poll-1')).toBeNull();
  });

  it('fetchPriorityTurnout returns null when Supabase is not configured', async () => {
    expect(await fetchPriorityTurnout('aso-1')).toBeNull();
  });

  it('every helper returns null for an empty id (no RPC issued)', async () => {
    expect(await fetchSurveyTally('')).toBeNull();
    expect(await fetchPollTally('')).toBeNull();
    expect(await fetchPollRankedTally('')).toBeNull();
    expect(await fetchPriorityTurnout('')).toBeNull();
  });
});
