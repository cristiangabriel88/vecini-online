import { beforeEach, describe, expect, it } from 'vitest';
import { useEnergyStore } from '@/features/energy/energyStore';
import { hydrateEnergy, addEnergyRecordLive } from '@/features/energy/energyApi';
import { energyForAsociatie, seedEnergy } from '@/features/energy/energyLogic';
import { DEMO_ASOCIATIE, DEMO_ENERGY } from '@/shared/demo/demoData';

const ASOC = DEMO_ASOCIATIE.id;

beforeEach(() => {
  useEnergyStore.setState({ byAsociatie: seedEnergy(), fetchError: null });
});

describe('hydrateEnergy', () => {
  it('is a no-op when Supabase is not configured', async () => {
    const before = useEnergyStore.getState().byAsociatie;
    await hydrateEnergy(ASOC);
    expect(useEnergyStore.getState().byAsociatie).toBe(before);
    expect(useEnergyStore.getState().fetchError).toBeNull();
  });

  it('is a no-op when asociatieId is empty', async () => {
    const before = useEnergyStore.getState().byAsociatie;
    await hydrateEnergy('');
    expect(useEnergyStore.getState().byAsociatie).toBe(before);
  });
});

describe('addEnergyRecordLive', () => {
  it('prepends the record synchronously', () => {
    const before = energyForAsociatie(useEnergyStore.getState().byAsociatie, ASOC).length;
    addEnergyRecordLive(ASOC, {
      id: 'en-test',
      asociatie_id: ASOC,
      period: '2026-05-01',
      kind: 'Lift',
      amount: 300,
      cost: 230,
    });
    const after = energyForAsociatie(useEnergyStore.getState().byAsociatie, ASOC);
    expect(after).toHaveLength(before + 1);
    expect(after[0].id).toBe('en-test');
  });

  it('preserves demo records after adding one', () => {
    addEnergyRecordLive(ASOC, {
      id: 'en-test2',
      asociatie_id: ASOC,
      period: '2026-05-01',
      kind: 'Altele',
      amount: 100,
      cost: 80,
    });
    const after = energyForAsociatie(useEnergyStore.getState().byAsociatie, ASOC);
    const demoIds = DEMO_ENERGY.map((r) => r.id);
    expect(after.filter((r) => demoIds.includes(r.id))).toHaveLength(DEMO_ENERGY.length);
  });
});
