import { beforeEach, describe, expect, it } from 'vitest';
import { useContractorStore } from '@/features/contractors/contractorStore';
import {
  hydrateContractors,
  addContractorLive,
  rateContractorLive,
  toggleContractorAvailableLive,
} from '@/features/contractors/contractorsApi';
import { contractorsForAsociatie, seedContractors } from '@/features/contractors/contractorLogic';
import { DEMO_ASOCIATIE, DEMO_CONTRACTORS } from '@/shared/demo/demoData';

const ASOC = DEMO_ASOCIATIE.id;

beforeEach(() => {
  useContractorStore.setState({ byAsociatie: seedContractors(), fetchError: null });
});

describe('hydrateContractors', () => {
  it('is a no-op when Supabase is not configured', async () => {
    const before = useContractorStore.getState().byAsociatie;
    await hydrateContractors(ASOC);
    expect(useContractorStore.getState().byAsociatie).toBe(before);
    expect(useContractorStore.getState().fetchError).toBeNull();
  });

  it('is a no-op when asociatieId is empty', async () => {
    const before = useContractorStore.getState().byAsociatie;
    await hydrateContractors('');
    expect(useContractorStore.getState().byAsociatie).toBe(before);
  });
});

describe('addContractorLive', () => {
  it('prepends the contractor synchronously', () => {
    const before = contractorsForAsociatie(useContractorStore.getState().byAsociatie, ASOC).length;
    addContractorLive(ASOC, {
      id: 'ct-test',
      asociatie_id: ASOC,
      name: 'Test SRL',
      specialty: 'Zugrăveli',
      price_tier: 'scazut',
      contact: '',
      last_used: null,
      available: true,
      rating: 0,
      rating_count: 0,
    });
    const after = contractorsForAsociatie(useContractorStore.getState().byAsociatie, ASOC);
    expect(after).toHaveLength(before + 1);
    expect(after[0].id).toBe('ct-test');
  });

  it('preserves demo contractors after adding one', () => {
    addContractorLive(ASOC, {
      id: 'ct-test2',
      asociatie_id: ASOC,
      name: 'Alt SRL',
      specialty: 'Inst. sanitare',
      price_tier: 'mediu',
      contact: '',
      last_used: null,
      available: true,
      rating: 0,
      rating_count: 0,
    });
    const after = contractorsForAsociatie(useContractorStore.getState().byAsociatie, ASOC);
    const demoIds = DEMO_CONTRACTORS.map((c) => c.id);
    expect(after.filter((c) => demoIds.includes(c.id))).toHaveLength(DEMO_CONTRACTORS.length);
  });
});

describe('rateContractorLive', () => {
  it('updates the rating in the store', () => {
    rateContractorLive(ASOC, 'ct-1', 'u-com', 3);
    const after = contractorsForAsociatie(useContractorStore.getState().byAsociatie, ASOC);
    const c = after.find((x) => x.id === 'ct-1');
    expect(c?.rating_count).toBeGreaterThan(0);
  });
});

describe('toggleContractorAvailableLive', () => {
  it('flips the available flag in the store', () => {
    const before = contractorsForAsociatie(useContractorStore.getState().byAsociatie, ASOC).find(
      (c) => c.id === 'ct-1',
    )?.available;
    toggleContractorAvailableLive(ASOC, 'ct-1', !before);
    const after = contractorsForAsociatie(useContractorStore.getState().byAsociatie, ASOC).find(
      (c) => c.id === 'ct-1',
    )?.available;
    expect(after).toBe(!before);
  });
});
