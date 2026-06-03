import { beforeEach, describe, expect, it } from 'vitest';
import { useLendingStore } from '@/features/lending/lendingStore';
import { hydrateLendingItems, addLendingItem, toggleLendingAvailable } from '@/features/lending/lendingApi';
import { lendingForAsociatie, seedLending } from '@/features/lending/lendingLogic';
import { DEMO_ASOCIATIE, DEMO_LENDING_ITEMS } from '@/shared/demo/demoData';
import type { LendingItem } from '@/shared/types/domain';

// lendingApi offline-path tests (T214).
// Key contracts:
//   - hydrateLendingItems: no-op when not configured / empty id
//   - addLendingItem: prepends synchronously, offline-safe
//   - toggleLendingAvailable: flips available; offline-safe, idempotent to pair calls

const ASOC = DEMO_ASOCIATIE.id;

function makeItem(overrides?: Partial<LendingItem>): LendingItem {
  return {
    id: `li-test-${Date.now()}`,
    asociatie_id: ASOC,
    owner_user_id: 'u-test',
    owner_name: 'Test User',
    name: 'Ciocan',
    category: 'unelte',
    photo_path: null,
    available: true,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  useLendingStore.setState({ byAsociatie: seedLending(), fetchError: null });
});

describe('hydrateLendingItems', () => {
  it('is a no-op when Supabase is not configured (offline/CI)', async () => {
    const before = useLendingStore.getState().byAsociatie;
    await hydrateLendingItems(ASOC);
    expect(useLendingStore.getState().byAsociatie).toBe(before);
    expect(useLendingStore.getState().fetchError).toBeNull();
  });

  it('is a no-op when asociatieId is empty', async () => {
    const before = useLendingStore.getState().byAsociatie;
    await hydrateLendingItems('');
    expect(useLendingStore.getState().byAsociatie).toBe(before);
  });
});

describe('addLendingItem', () => {
  it('prepends the item synchronously to the store', () => {
    const before = lendingForAsociatie(useLendingStore.getState().byAsociatie, ASOC).length;
    const item = makeItem();
    addLendingItem(ASOC, item);
    const after = lendingForAsociatie(useLendingStore.getState().byAsociatie, ASOC);
    expect(after).toHaveLength(before + 1);
    expect(after[0].id).toBe(item.id);
  });

  it('preserves the demo items after adding a new one', () => {
    addLendingItem(ASOC, makeItem());
    const after = lendingForAsociatie(useLendingStore.getState().byAsociatie, ASOC);
    const demoIds = DEMO_LENDING_ITEMS.map((it) => it.id);
    expect(after.filter((it) => demoIds.includes(it.id))).toHaveLength(DEMO_LENDING_ITEMS.length);
  });
});

describe('toggleLendingAvailable', () => {
  it('flips available from true to false', () => {
    const item = DEMO_LENDING_ITEMS.find((it) => it.available)!;
    toggleLendingAvailable(ASOC, item);
    const stored = lendingForAsociatie(useLendingStore.getState().byAsociatie, ASOC).find(
      (it) => it.id === item.id,
    )!;
    expect(stored.available).toBe(false);
  });

  it('flips available from false to true', () => {
    const item = DEMO_LENDING_ITEMS.find((it) => !it.available)!;
    toggleLendingAvailable(ASOC, item);
    const stored = lendingForAsociatie(useLendingStore.getState().byAsociatie, ASOC).find(
      (it) => it.id === item.id,
    )!;
    expect(stored.available).toBe(true);
  });

  it('does not affect other items', () => {
    const item = DEMO_LENDING_ITEMS[0];
    toggleLendingAvailable(ASOC, item);
    const others = lendingForAsociatie(useLendingStore.getState().byAsociatie, ASOC).filter(
      (it) => it.id !== item.id,
    );
    const origOthers = DEMO_LENDING_ITEMS.filter((it) => it.id !== item.id);
    expect(others.map((it) => it.available)).toEqual(origOthers.map((it) => it.available));
  });
});
