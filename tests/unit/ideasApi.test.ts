import { beforeEach, describe, expect, it } from 'vitest';
import { useIdeasStore } from '@/features/ideas/ideasStore';
import { hydrateIdeas, submitIdea, castIdeaVote } from '@/features/ideas/ideasApi';
import { ideasForAsociatie, seedIdeas } from '@/features/ideas/ideaLogic';
import { DEMO_ASOCIATIE, DEMO_IDEAS } from '@/shared/demo/demoData';

// ideasApi offline-path tests (T194).
// Live-path tests require a real Supabase backend; CI exercises the offline path
// (isSupabaseConfigured === false). Key contracts:
//   - hydrateIdeas: no-op when not configured / empty id (store untouched)
//   - submitIdea: applies synchronously to the store, offline-safe
//   - castIdeaVote: toggles myVotes and increments/decrements the vote count

const ASOC = DEMO_ASOCIATIE.id;

function makeIdea(overrides?: Partial<(typeof DEMO_IDEAS)[0]>) {
  return {
    id: `idea-test-${Date.now()}`,
    asociatie_id: ASOC,
    author_user_id: 'u-test',
    author_name: 'Test User',
    title: 'Idee test',
    body: 'Detalii test',
    status: 'in_discutie' as const,
    votes: 1,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  useIdeasStore.setState({ byAsociatie: seedIdeas(), myVotes: {}, fetchError: null });
});

describe('hydrateIdeas', () => {
  it('is a no-op when Supabase is not configured (offline/CI)', async () => {
    const before = useIdeasStore.getState().byAsociatie;
    await hydrateIdeas(ASOC);
    expect(useIdeasStore.getState().byAsociatie).toBe(before);
    expect(useIdeasStore.getState().fetchError).toBeNull();
  });

  it('is a no-op when asociatieId is empty', async () => {
    const before = useIdeasStore.getState().byAsociatie;
    await hydrateIdeas('');
    expect(useIdeasStore.getState().byAsociatie).toBe(before);
  });
});

describe('submitIdea', () => {
  it('prepends the idea to the store synchronously', () => {
    const before = ideasForAsociatie(useIdeasStore.getState().byAsociatie, ASOC).items.length;
    const idea = makeIdea();
    submitIdea(ASOC, idea, null);
    const after = ideasForAsociatie(useIdeasStore.getState().byAsociatie, ASOC).items;
    expect(after).toHaveLength(before + 1);
    expect(after[0].id).toBe(idea.id);
  });

  it('marks the submitted idea as voted (myVotes)', () => {
    const idea = makeIdea();
    submitIdea(ASOC, idea, null);
    expect(useIdeasStore.getState().myVotes[idea.id]).toBe(true);
  });

  it('stores the correct title and body', () => {
    const idea = makeIdea({ title: 'Alee biciclete', body: 'O pistă amenajată.' });
    submitIdea(ASOC, idea, null);
    const stored = ideasForAsociatie(useIdeasStore.getState().byAsociatie, ASOC).items.find(
      (i) => i.id === idea.id,
    );
    expect(stored?.title).toBe('Alee biciclete');
    expect(stored?.body).toBe('O pistă amenajată.');
  });
});

describe('castIdeaVote', () => {
  it('increments the vote count and sets myVotes to true', () => {
    const target = DEMO_IDEAS[0];
    const before = ideasForAsociatie(useIdeasStore.getState().byAsociatie, ASOC).items.find(
      (i) => i.id === target.id,
    )!.votes;
    castIdeaVote(ASOC, target.id, null);
    const after = ideasForAsociatie(useIdeasStore.getState().byAsociatie, ASOC).items.find(
      (i) => i.id === target.id,
    )!;
    expect(after.votes).toBe(before + 1);
    expect(useIdeasStore.getState().myVotes[target.id]).toBe(true);
  });

  it('toggling twice restores the original count', () => {
    const target = DEMO_IDEAS[0];
    const before = ideasForAsociatie(useIdeasStore.getState().byAsociatie, ASOC).items.find(
      (i) => i.id === target.id,
    )!.votes;
    castIdeaVote(ASOC, target.id, null);
    castIdeaVote(ASOC, target.id, null);
    const after = ideasForAsociatie(useIdeasStore.getState().byAsociatie, ASOC).items.find(
      (i) => i.id === target.id,
    )!;
    expect(after.votes).toBe(before);
    expect(useIdeasStore.getState().myVotes[target.id]).toBe(false);
  });
});
