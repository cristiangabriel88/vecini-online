import { beforeEach, describe, expect, it } from 'vitest';
import { usePollsStore } from '@/features/polls/pollsStore';
import { hydratePolls, recordVote } from '@/features/polls/pollsApi';
import { seedPolls, seedVoteCounts } from '@/features/polls/pollLogic';

// pollsApi offline-path tests (T189).
// Live-path tests require a real Supabase backend; the offline path
// (isSupabaseConfigured === false) is what CI exercises here. Key contracts:
//   - hydratePolls: no-op when not configured / empty id (store untouched)
//   - recordVote: applies an optimistic ballot, idempotent per poll, and does
//     not throw when offline (no apartment needed offline)

beforeEach(() => {
  usePollsStore.setState({
    byAsociatie: seedPolls(),
    counts: seedVoteCounts(),
    myVotes: {},
    fetchError: null,
  });
});

describe('hydratePolls', () => {
  it('is a no-op when Supabase is not configured (offline/CI)', async () => {
    const before = usePollsStore.getState().byAsociatie;
    const counts = usePollsStore.getState().counts;
    await hydratePolls('demo-asoc');
    expect(usePollsStore.getState().byAsociatie).toBe(before);
    expect(usePollsStore.getState().counts).toBe(counts);
    expect(usePollsStore.getState().fetchError).toBeNull();
  });

  it('is a no-op when asociatieId is empty', async () => {
    const before = usePollsStore.getState().byAsociatie;
    await hydratePolls('');
    expect(usePollsStore.getState().byAsociatie).toBe(before);
  });
});

describe('recordVote', () => {
  it('applies an optimistic ballot to the counts and records the choice', () => {
    const start = usePollsStore.getState().counts['po-1'] ?? 0;
    recordVote('demo-asoc', 'poll-1', 'po-1', 'u-1', null);
    expect(usePollsStore.getState().counts['po-1']).toBe(start + 1);
    expect(usePollsStore.getState().myVotes['poll-1']).toBe('po-1');
  });

  it('is idempotent: a second ballot for the same poll is ignored', () => {
    recordVote('demo-asoc', 'poll-1', 'po-1', 'u-1', null);
    const after = usePollsStore.getState().counts['po-1'];
    recordVote('demo-asoc', 'poll-1', 'po-2', 'u-1', null);
    expect(usePollsStore.getState().counts['po-1']).toBe(after); // unchanged
    expect(usePollsStore.getState().myVotes['poll-1']).toBe('po-1'); // first choice stands
  });
});
