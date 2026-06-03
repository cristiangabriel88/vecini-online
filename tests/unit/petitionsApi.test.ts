import { describe, expect, it, beforeEach } from 'vitest';
import { usePetitionStore } from '@/features/petitions/petitionStore';
import {
  createPetition,
  hydratePetitions,
  savePetitionResponse,
  signPetition,
} from '@/features/petitions/petitionApi';
import { newPetition, petitionHasResponse, petitionsForAsociatie } from '@/features/petitions/petitionLogic';

const ASOC = 'test-asoc';

function freshPetition() {
  return newPetition(
    { title: 'Titlu test', body: 'Corp test' },
    ASOC,
    'u-1',
    'Ion',
    10,
    new Date('2026-06-03T12:00:00Z'),
  );
}

beforeEach(() => {
  usePetitionStore.setState({
    byAsociatie: {},
    mySigned: {},
    fetchError: null,
  });
});

describe('hydratePetitions (offline path)', () => {
  it('is a no-op when supabase is not configured', async () => {
    await hydratePetitions(ASOC, 10);
    const items = petitionsForAsociatie(usePetitionStore.getState().byAsociatie, ASOC).items;
    expect(items).toHaveLength(0);
    expect(usePetitionStore.getState().fetchError).toBeNull();
  });

  it('is a no-op when asociatieId is empty', async () => {
    await hydratePetitions('', 10);
    expect(usePetitionStore.getState().fetchError).toBeNull();
  });
});

describe('createPetition (offline path)', () => {
  it('prepends the petition to the store synchronously', () => {
    const petition = freshPetition();
    createPetition(ASOC, petition, null);
    const items = petitionsForAsociatie(usePetitionStore.getState().byAsociatie, ASOC).items;
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe(petition.id);
    expect(items[0].title).toBe('Titlu test');
  });

  it('marks the creator as having signed', () => {
    const petition = freshPetition();
    createPetition(ASOC, petition, null);
    expect(usePetitionStore.getState().mySigned[petition.id]).toBe(true);
  });
});

describe('signPetition (offline path)', () => {
  it('increments signature count and sets mySigned', () => {
    const petition = freshPetition();
    createPetition(ASOC, petition, null);
    usePetitionStore.setState((s) => ({
      mySigned: { ...s.mySigned, [petition.id]: false },
    }));

    signPetition(ASOC, petition.id, null);
    const items = petitionsForAsociatie(usePetitionStore.getState().byAsociatie, ASOC).items;
    const updated = items.find((p) => p.id === petition.id);
    expect(updated?.signatures).toBe(2);
    expect(usePetitionStore.getState().mySigned[petition.id]).toBe(true);
  });

  it('is idempotent when already signed', () => {
    const petition = freshPetition();
    createPetition(ASOC, petition, null);
    signPetition(ASOC, petition.id, null);
    signPetition(ASOC, petition.id, null);
    const items = petitionsForAsociatie(usePetitionStore.getState().byAsociatie, ASOC).items;
    const updated = items.find((p) => p.id === petition.id);
    expect(updated?.signatures).toBe(1);
  });

  it('flips status to inaintata when threshold is reached', () => {
    const petition = newPetition(
      { title: 'Titlu prag', body: 'Corp prag' },
      ASOC,
      'u-1',
      'Ion',
      4,
      new Date('2026-06-03T12:00:00Z'),
    );
    usePetitionStore.getState().addPetition(ASOC, petition);
    usePetitionStore.setState((s) => ({
      mySigned: { ...s.mySigned, [petition.id]: false },
      byAsociatie: {
        ...s.byAsociatie,
        [ASOC]: {
          items: s.byAsociatie[ASOC].items.map((p) =>
            p.id === petition.id ? { ...p, signatures: 0 } : p,
          ),
        },
      },
    }));

    signPetition(ASOC, petition.id, null);
    const items = petitionsForAsociatie(usePetitionStore.getState().byAsociatie, ASOC).items;
    const updated = items.find((p) => p.id === petition.id);
    expect(updated?.status).toBe('inaintata');
  });
});

describe('savePetitionResponse (offline path)', () => {
  it('applies the response to the store synchronously', () => {
    const petition = freshPetition();
    createPetition(ASOC, petition, null);

    savePetitionResponse(ASOC, petition.id, 'Comitetul a luat act și va răspunde în 30 de zile.', 'Ion Popescu', null);

    const items = petitionsForAsociatie(usePetitionStore.getState().byAsociatie, ASOC).items;
    const updated = items.find((p) => p.id === petition.id);
    expect(petitionHasResponse(updated!)).toBe(true);
    expect(updated?.response).toBe('Comitetul a luat act și va răspunde în 30 de zile.');
    expect(updated?.responded_by_name).toBe('Ion Popescu');
    expect(updated?.responded_at).toBeTruthy();
  });

  it('is idempotent if called twice (second call overwrites)', () => {
    const petition = freshPetition();
    createPetition(ASOC, petition, null);

    savePetitionResponse(ASOC, petition.id, 'Primul răspuns de cel puțin douăzeci de caractere.', 'A', null);
    savePetitionResponse(ASOC, petition.id, 'Al doilea răspuns de cel puțin douăzeci de caractere.', 'B', null);

    const items = petitionsForAsociatie(usePetitionStore.getState().byAsociatie, ASOC).items;
    const updated = items.find((p) => p.id === petition.id);
    expect(updated?.response).toBe('Al doilea răspuns de cel puțin douăzeci de caractere.');
    expect(updated?.responded_by_name).toBe('B');
  });
});
