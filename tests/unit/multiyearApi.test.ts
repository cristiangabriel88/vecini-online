import { beforeEach, describe, expect, it } from 'vitest';
import { useMultiyearStore } from '@/features/multiyear/multiyearStore';
import { hydrateMultiyear, addMultiyearItemLive } from '@/features/multiyear/multiyearApi';
import { multiyearForAsociatie, seedMultiyear } from '@/features/multiyear/multiyearLogic';
import { DEMO_ASOCIATIE } from '@/shared/demo/demoData';

const ASOC = DEMO_ASOCIATIE.id;

beforeEach(() => {
  useMultiyearStore.setState({ byAsociatie: seedMultiyear(), fetchError: null });
});

describe('hydrateMultiyear', () => {
  it('is a no-op when Supabase is not configured', async () => {
    const before = useMultiyearStore.getState().byAsociatie;
    await hydrateMultiyear(ASOC);
    expect(useMultiyearStore.getState().byAsociatie).toBe(before);
    expect(useMultiyearStore.getState().fetchError).toBeNull();
  });

  it('is a no-op when asociatieId is empty', async () => {
    const before = useMultiyearStore.getState().byAsociatie;
    await hydrateMultiyear('');
    expect(useMultiyearStore.getState().byAsociatie).toBe(before);
  });
});

describe('addMultiyearItemLive', () => {
  it('prepends the item synchronously', () => {
    const before = multiyearForAsociatie(useMultiyearStore.getState().byAsociatie, ASOC).length;
    addMultiyearItemLive(ASOC, {
      id: 'mp-test',
      asociatie_id: ASOC,
      year: 2030,
      title: 'Modernizare sistem termic',
      estimated_cost: 50000,
      notes: null,
    });
    const after = multiyearForAsociatie(useMultiyearStore.getState().byAsociatie, ASOC);
    expect(after).toHaveLength(before + 1);
    expect(after[0].id).toBe('mp-test');
  });
});
