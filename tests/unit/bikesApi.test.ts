import { beforeEach, describe, expect, it } from 'vitest';
import { useBikesStore } from '@/features/bikes/bikesStore';
import { hydrateBikes, addBike, toggleBikeAbandoned } from '@/features/bikes/bikesApi';
import { bikesForAsociatie, seedBikes } from '@/features/bikes/bikeLogic';
import { DEMO_ASOCIATIE, DEMO_BIKES } from '@/shared/demo/demoData';
import type { Bike } from '@/shared/types/domain';

// bikesApi offline-path tests (T215).
// Key contracts:
//   - hydrateBikes: no-op when not configured / empty id
//   - addBike: prepends synchronously, offline-safe
//   - toggleBikeAbandoned: flips abandoned; offline-safe

const ASOC = DEMO_ASOCIATIE.id;

function makeBike(overrides?: Partial<Bike>): Bike {
  return {
    id: `bk-test-${Date.now()}`,
    asociatie_id: ASOC,
    owner_user_id: 'u-test',
    owner_name: 'Test User',
    description: 'Bicicletă test',
    serial: null,
    photo_path: null,
    abandoned: false,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  useBikesStore.setState({ byAsociatie: seedBikes(), fetchError: null });
});

describe('hydrateBikes', () => {
  it('is a no-op when Supabase is not configured (offline/CI)', async () => {
    const before = useBikesStore.getState().byAsociatie;
    await hydrateBikes(ASOC);
    expect(useBikesStore.getState().byAsociatie).toBe(before);
    expect(useBikesStore.getState().fetchError).toBeNull();
  });

  it('is a no-op when asociatieId is empty', async () => {
    const before = useBikesStore.getState().byAsociatie;
    await hydrateBikes('');
    expect(useBikesStore.getState().byAsociatie).toBe(before);
  });
});

describe('addBike', () => {
  it('prepends the bike synchronously to the store', () => {
    const before = bikesForAsociatie(useBikesStore.getState().byAsociatie, ASOC).length;
    const bike = makeBike();
    addBike(ASOC, bike);
    const after = bikesForAsociatie(useBikesStore.getState().byAsociatie, ASOC);
    expect(after).toHaveLength(before + 1);
    expect(after[0].id).toBe(bike.id);
  });

  it('preserves the demo bikes after adding a new one', () => {
    addBike(ASOC, makeBike());
    const after = bikesForAsociatie(useBikesStore.getState().byAsociatie, ASOC);
    const demoIds = DEMO_BIKES.map((b) => b.id);
    expect(after.filter((b) => demoIds.includes(b.id))).toHaveLength(DEMO_BIKES.length);
  });
});

describe('toggleBikeAbandoned', () => {
  it('flips abandoned from false to true', () => {
    const bike = DEMO_BIKES.find((b) => !b.abandoned)!;
    toggleBikeAbandoned(ASOC, bike);
    const stored = bikesForAsociatie(useBikesStore.getState().byAsociatie, ASOC).find(
      (b) => b.id === bike.id,
    )!;
    expect(stored.abandoned).toBe(true);
  });

  it('flips abandoned from true to false', () => {
    const bike = DEMO_BIKES.find((b) => b.abandoned)!;
    toggleBikeAbandoned(ASOC, bike);
    const stored = bikesForAsociatie(useBikesStore.getState().byAsociatie, ASOC).find(
      (b) => b.id === bike.id,
    )!;
    expect(stored.abandoned).toBe(false);
  });
});
