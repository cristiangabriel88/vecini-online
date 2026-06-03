import { beforeEach, describe, expect, it } from 'vitest';
import { useRepairRecordsStore } from '@/features/repairs/repairRecordsStore';
import { hydrateRepairs, addRepair } from '@/features/repairs/repairRecordsApi';
import { repairsForAsociatie, seedRepairs } from '@/features/repairs/repairLogic';
import { DEMO_ASOCIATIE, DEMO_REPAIRS } from '@/shared/demo/demoData';
import type { RepairRecord } from '@/shared/types/domain';

// repairRecordsApi offline-path tests (T213).
// Live-path tests require a real Supabase backend; the offline path
// (isSupabaseConfigured === false) is what CI exercises here. Key contracts:
//   - hydrateRepairs: no-op when not configured / empty id (store untouched)
//   - addRepair: applies synchronously to the store, offline-safe

const ASOC = DEMO_ASOCIATIE.id;

function makeRecord(overrides?: Partial<RepairRecord>): RepairRecord {
  return {
    id: `rr-test-${Date.now()}`,
    asociatie_id: ASOC,
    system: 'electric',
    title: 'Inlocuire sigurante',
    description: 'Sigurante inlocuite la tabloul de la parter.',
    contractor: 'ElectroFix SRL',
    cost: 800,
    warranty_until: '2027-01-01',
    performed_at: '2026-01-15',
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  useRepairRecordsStore.setState({ byAsociatie: seedRepairs(), fetchError: null });
});

describe('hydrateRepairs', () => {
  it('is a no-op when Supabase is not configured (offline/CI)', async () => {
    const before = useRepairRecordsStore.getState().byAsociatie;
    await hydrateRepairs(ASOC);
    expect(useRepairRecordsStore.getState().byAsociatie).toBe(before);
    expect(useRepairRecordsStore.getState().fetchError).toBeNull();
  });

  it('is a no-op when asociatieId is empty', async () => {
    const before = useRepairRecordsStore.getState().byAsociatie;
    await hydrateRepairs('');
    expect(useRepairRecordsStore.getState().byAsociatie).toBe(before);
  });
});

describe('addRepair', () => {
  it('prepends the record synchronously to the store', () => {
    const before = repairsForAsociatie(useRepairRecordsStore.getState().byAsociatie, ASOC).length;
    const record = makeRecord();
    addRepair(ASOC, record);
    const after = repairsForAsociatie(useRepairRecordsStore.getState().byAsociatie, ASOC);
    expect(after).toHaveLength(before + 1);
    expect(after[0].id).toBe(record.id);
  });

  it('stores title, system and cost correctly', () => {
    const record = makeRecord({ title: 'Test reparatie', system: 'apa', cost: 1234 });
    addRepair(ASOC, record);
    const stored = repairsForAsociatie(useRepairRecordsStore.getState().byAsociatie, ASOC)[0];
    expect(stored.title).toBe('Test reparatie');
    expect(stored.system).toBe('apa');
    expect(stored.cost).toBe(1234);
  });

  it('preserves the seeded demo records after adding one', () => {
    addRepair(ASOC, makeRecord());
    const after = repairsForAsociatie(useRepairRecordsStore.getState().byAsociatie, ASOC);
    const demoIds = DEMO_REPAIRS.map((r) => r.id);
    expect(after.filter((r) => demoIds.includes(r.id))).toHaveLength(DEMO_REPAIRS.length);
  });
});
