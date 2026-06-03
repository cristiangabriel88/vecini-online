import { beforeEach, describe, expect, it } from 'vitest';
import { useRfpStore } from '@/features/rfp/rfpStore';
import { hydrateRfps, addRfpItem, addRfpQuote, decideRfpItem } from '@/features/rfp/rfpApi';
import { rfpsForAsociatie, seedRfps } from '@/features/rfp/rfpLogic';
import { DEMO_ASOCIATIE, DEMO_RFPS } from '@/shared/demo/demoData';
import type { Rfp, RfpQuote } from '@/shared/types/domain';

// rfpApi offline-path tests (T214).
// Live-path tests require a real Supabase backend; CI exercises the offline path
// (isSupabaseConfigured === false). Key contracts:
//   - hydrateRfps: no-op when not configured / empty id
//   - addRfpItem: prepends synchronously; offline-safe
//   - addRfpQuote: appends quote synchronously; offline-safe
//   - decideRfpItem: marks winner + status offline; idempotent

const ASOC = DEMO_ASOCIATIE.id;

function makeRfp(overrides?: Partial<Rfp>): Rfp {
  return {
    id: `rfp-test-${Date.now()}`,
    asociatie_id: ASOC,
    title: 'Reparatie pompa',
    description: '',
    status: 'deschis',
    created_at: new Date().toISOString(),
    quotes: [],
    ...overrides,
  };
}

function makeQuote(rfpId: string, overrides?: Partial<RfpQuote>): RfpQuote {
  return {
    id: `q-test-${Date.now()}`,
    rfp_id: rfpId,
    contractor: 'Test SRL',
    amount: 5000,
    selected: false,
    ...overrides,
  };
}

beforeEach(() => {
  useRfpStore.setState({ byAsociatie: seedRfps(), fetchError: null });
});

describe('hydrateRfps', () => {
  it('is a no-op when Supabase is not configured (offline/CI)', async () => {
    const before = useRfpStore.getState().byAsociatie;
    await hydrateRfps(ASOC);
    expect(useRfpStore.getState().byAsociatie).toBe(before);
    expect(useRfpStore.getState().fetchError).toBeNull();
  });

  it('is a no-op when asociatieId is empty', async () => {
    const before = useRfpStore.getState().byAsociatie;
    await hydrateRfps('');
    expect(useRfpStore.getState().byAsociatie).toBe(before);
  });
});

describe('addRfpItem', () => {
  it('prepends the RFP synchronously to the store', () => {
    const before = rfpsForAsociatie(useRfpStore.getState().byAsociatie, ASOC).length;
    const rfp = makeRfp();
    addRfpItem(ASOC, rfp);
    const after = rfpsForAsociatie(useRfpStore.getState().byAsociatie, ASOC);
    expect(after).toHaveLength(before + 1);
    expect(after[0].id).toBe(rfp.id);
  });

  it('preserves the demo RFPs after adding a new one', () => {
    addRfpItem(ASOC, makeRfp());
    const after = rfpsForAsociatie(useRfpStore.getState().byAsociatie, ASOC);
    const demoIds = DEMO_RFPS.map((r) => r.id);
    expect(after.filter((r) => demoIds.includes(r.id))).toHaveLength(DEMO_RFPS.length);
  });
});

describe('addRfpQuote', () => {
  it('appends a quote to the target RFP synchronously', () => {
    const rfpId = DEMO_RFPS[0].id;
    const before = rfpsForAsociatie(useRfpStore.getState().byAsociatie, ASOC)
      .find((r) => r.id === rfpId)!.quotes.length;
    const quote = makeQuote(rfpId);
    addRfpQuote(ASOC, rfpId, quote);
    const rfp = rfpsForAsociatie(useRfpStore.getState().byAsociatie, ASOC).find(
      (r) => r.id === rfpId,
    )!;
    expect(rfp.quotes).toHaveLength(before + 1);
    expect(rfp.quotes.some((q) => q.id === quote.id)).toBe(true);
  });
});

describe('decideRfpItem', () => {
  it('marks the chosen quote as selected and closes the RFP', () => {
    const rfpId = DEMO_RFPS[0].id;
    const rfpBefore = rfpsForAsociatie(useRfpStore.getState().byAsociatie, ASOC).find(
      (r) => r.id === rfpId,
    )!;
    const targetQuote = rfpBefore.quotes[0];
    decideRfpItem(ASOC, rfpId, targetQuote.id);
    const rfp = rfpsForAsociatie(useRfpStore.getState().byAsociatie, ASOC).find(
      (r) => r.id === rfpId,
    )!;
    expect(rfp.status).toBe('decis');
    expect(rfp.quotes.find((q) => q.id === targetQuote.id)!.selected).toBe(true);
    expect(rfp.quotes.filter((q) => q.id !== targetQuote.id).every((q) => !q.selected)).toBe(true);
  });
});
