import { beforeEach, describe, expect, it } from 'vitest';
import { useStorageStore } from '@/features/storage/storageStore';
import { hydrateStorageUnits, addStorageUnit } from '@/features/storage/storageApi';
import { storageForAsociatie, seedStorageUnits } from '@/features/storage/storageLogic';
import { DEMO_ASOCIATIE, DEMO_STORAGE_UNITS } from '@/shared/demo/demoData';
import type { StorageUnit } from '@/shared/types/domain';

// storageApi offline-path tests (T215).
// Key contracts:
//   - hydrateStorageUnits: no-op when not configured / empty id
//   - addStorageUnit: prepends synchronously, offline-safe

const ASOC = DEMO_ASOCIATIE.id;

function makeUnit(overrides?: Partial<StorageUnit>): StorageUnit {
  return {
    id: `su-test-${Date.now()}`,
    asociatie_id: ASOC,
    label: 'Boxa test',
    apartment_id: null,
    apartment_label: null,
    notes: null,
    ...overrides,
  };
}

beforeEach(() => {
  useStorageStore.setState({ byAsociatie: seedStorageUnits(), fetchError: null });
});

describe('hydrateStorageUnits', () => {
  it('is a no-op when Supabase is not configured (offline/CI)', async () => {
    const before = useStorageStore.getState().byAsociatie;
    await hydrateStorageUnits(ASOC);
    expect(useStorageStore.getState().byAsociatie).toBe(before);
    expect(useStorageStore.getState().fetchError).toBeNull();
  });

  it('is a no-op when asociatieId is empty', async () => {
    const before = useStorageStore.getState().byAsociatie;
    await hydrateStorageUnits('');
    expect(useStorageStore.getState().byAsociatie).toBe(before);
  });
});

describe('addStorageUnit', () => {
  it('prepends the unit synchronously to the store', () => {
    const before = storageForAsociatie(useStorageStore.getState().byAsociatie, ASOC).length;
    const unit = makeUnit();
    addStorageUnit(ASOC, unit);
    const after = storageForAsociatie(useStorageStore.getState().byAsociatie, ASOC);
    expect(after).toHaveLength(before + 1);
    expect(after[0].id).toBe(unit.id);
  });

  it('preserves the demo units after adding a new one', () => {
    addStorageUnit(ASOC, makeUnit());
    const after = storageForAsociatie(useStorageStore.getState().byAsociatie, ASOC);
    const demoIds = DEMO_STORAGE_UNITS.map((u) => u.id);
    expect(after.filter((u) => demoIds.includes(u.id))).toHaveLength(DEMO_STORAGE_UNITS.length);
  });
});
