import { beforeEach, describe, expect, it } from 'vitest';
import { useCrowdfundStore } from '@/features/crowdfund/crowdfundStore';
import { hydrateCrowdfunds, createCrowdfundLive, pledgeLive } from '@/features/crowdfund/crowdfundApi';
import { crowdfundsForAsociatie, seedCrowdfunds } from '@/features/crowdfund/crowdfundLogic';
import { DEMO_ASOCIATIE } from '@/shared/demo/demoData';

const ASOC = DEMO_ASOCIATIE.id;

beforeEach(() => {
  useCrowdfundStore.setState({ byAsociatie: seedCrowdfunds(), myPledged: [], fetchError: null });
});

describe('hydrateCrowdfunds', () => {
  it('is a no-op when Supabase is not configured', async () => {
    const before = useCrowdfundStore.getState().byAsociatie;
    await hydrateCrowdfunds(ASOC, null);
    expect(useCrowdfundStore.getState().byAsociatie).toBe(before);
    expect(useCrowdfundStore.getState().fetchError).toBeNull();
  });

  it('is a no-op when asociatieId is empty', async () => {
    const before = useCrowdfundStore.getState().byAsociatie;
    await hydrateCrowdfunds('', null);
    expect(useCrowdfundStore.getState().byAsociatie).toBe(before);
  });
});

describe('createCrowdfundLive', () => {
  it('prepends a crowdfund synchronously', () => {
    const before = crowdfundsForAsociatie(useCrowdfundStore.getState().byAsociatie, ASOC).length;
    createCrowdfundLive(ASOC, {
      id: 'cf-test',
      asociatie_id: ASOC,
      title: 'Bancă în curte',
      description: '',
      target_amount: 500,
      deadline: '2026-12-31',
      created_at: new Date().toISOString(),
      pledged: 0,
    });
    const after = crowdfundsForAsociatie(useCrowdfundStore.getState().byAsociatie, ASOC);
    expect(after).toHaveLength(before + 1);
    expect(after[0].id).toBe('cf-test');
  });
});

describe('pledgeLive', () => {
  it('increments pledged amount and records the pledge', () => {
    const id = 'cf-1';
    const before = crowdfundsForAsociatie(useCrowdfundStore.getState().byAsociatie, ASOC).find(
      (c) => c.id === id,
    )?.pledged ?? 0;
    pledgeLive(ASOC, id, 200, 'u-res');
    const after = crowdfundsForAsociatie(useCrowdfundStore.getState().byAsociatie, ASOC).find(
      (c) => c.id === id,
    )?.pledged ?? 0;
    expect(after).toBe(before + 200);
    expect(useCrowdfundStore.getState().myPledged).toContain(id);
  });

  it('is idempotent (second pledge ignored)', () => {
    const id = 'cf-1';
    pledgeLive(ASOC, id, 100, 'u-res');
    const afterFirst = crowdfundsForAsociatie(useCrowdfundStore.getState().byAsociatie, ASOC).find(
      (c) => c.id === id,
    )?.pledged ?? 0;
    pledgeLive(ASOC, id, 100, 'u-res');
    const afterSecond = crowdfundsForAsociatie(useCrowdfundStore.getState().byAsociatie, ASOC).find(
      (c) => c.id === id,
    )?.pledged ?? 0;
    expect(afterFirst).toBe(afterSecond);
  });
});
