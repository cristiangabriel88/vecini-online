import { beforeEach, describe, expect, it } from 'vitest';
import { useParkingStore } from '@/features/parking/parkingStore';
import { hydrateParking, addParkingSpot } from '@/features/parking/parkingApi';
import { parkingForAsociatie, seedParking } from '@/features/parking/parkingLogic';
import { DEMO_ASOCIATIE, DEMO_PARKING } from '@/shared/demo/demoData';
import type { ParkingSpot } from '@/shared/types/domain';

// parkingApi offline-path tests (T215).
// Key contracts:
//   - hydrateParking: no-op when not configured / empty id
//   - addParkingSpot: prepends synchronously, offline-safe

const ASOC = DEMO_ASOCIATIE.id;

function makeSpot(overrides?: Partial<ParkingSpot>): ParkingSpot {
  return {
    id: `pk-test-${Date.now()}`,
    asociatie_id: ASOC,
    label: 'P-test',
    zone: null,
    is_visitor: false,
    apartment_label: null,
    license_plate: null,
    ...overrides,
  };
}

beforeEach(() => {
  useParkingStore.setState({ byAsociatie: seedParking(), fetchError: null });
});

describe('hydrateParking', () => {
  it('is a no-op when Supabase is not configured (offline/CI)', async () => {
    const before = useParkingStore.getState().byAsociatie;
    await hydrateParking(ASOC);
    expect(useParkingStore.getState().byAsociatie).toBe(before);
    expect(useParkingStore.getState().fetchError).toBeNull();
  });

  it('is a no-op when asociatieId is empty', async () => {
    const before = useParkingStore.getState().byAsociatie;
    await hydrateParking('');
    expect(useParkingStore.getState().byAsociatie).toBe(before);
  });
});

describe('addParkingSpot', () => {
  it('prepends the spot synchronously to the store', () => {
    const before = parkingForAsociatie(useParkingStore.getState().byAsociatie, ASOC).length;
    const spot = makeSpot();
    addParkingSpot(ASOC, spot);
    const after = parkingForAsociatie(useParkingStore.getState().byAsociatie, ASOC);
    expect(after).toHaveLength(before + 1);
    expect(after[0].id).toBe(spot.id);
  });

  it('preserves the demo spots after adding a new one', () => {
    addParkingSpot(ASOC, makeSpot());
    const after = parkingForAsociatie(useParkingStore.getState().byAsociatie, ASOC);
    const demoIds = DEMO_PARKING.map((s) => s.id);
    expect(after.filter((s) => demoIds.includes(s.id))).toHaveLength(DEMO_PARKING.length);
  });
});
