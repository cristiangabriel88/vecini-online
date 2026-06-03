import { beforeEach, describe, expect, it } from 'vitest';
import { useGlossaryStore } from '@/features/glossary/glossaryStore';
import { hydrateGlossary } from '@/features/glossary/glossaryApi';
import { glossaryForAsociatie, seedGlossary } from '@/features/glossary/glossaryLogic';
import { DEMO_ASOCIATIE, DEMO_GLOSSARY } from '@/shared/demo/demoData';

// glossaryApi offline-path tests (T216).
// Key contracts:
//   - hydrateGlossary: no-op when not configured / empty id
//   - seedGlossary: returns demo entries for the demo asociatie

const ASOC = DEMO_ASOCIATIE.id;

beforeEach(() => {
  useGlossaryStore.setState({ byAsociatie: seedGlossary(), fetchError: null });
});

describe('hydrateGlossary', () => {
  it('is a no-op when Supabase is not configured (offline/CI)', async () => {
    const before = useGlossaryStore.getState().byAsociatie;
    await hydrateGlossary(ASOC);
    expect(useGlossaryStore.getState().byAsociatie).toBe(before);
    expect(useGlossaryStore.getState().fetchError).toBeNull();
  });

  it('is a no-op when asociatieId is empty', async () => {
    const before = useGlossaryStore.getState().byAsociatie;
    await hydrateGlossary('');
    expect(useGlossaryStore.getState().byAsociatie).toBe(before);
  });

  it('seeds demo glossary entries for the demo asociatie', () => {
    const entries = glossaryForAsociatie(useGlossaryStore.getState().byAsociatie, ASOC);
    expect(entries).toHaveLength(DEMO_GLOSSARY.length);
    expect(entries[0].id).toBe(DEMO_GLOSSARY[0].id);
  });
});
