import { beforeEach, describe, expect, it } from 'vitest';
import { useEvacuationStore } from '@/features/evacuation/evacuationStore';
import { hydrateEvacuation, persistPetMarker, removePetMarker } from '@/features/evacuation/evacuationApi';
import { seedEvacuation, evacuationForAsociatie } from '@/features/evacuation/evacuationLogic';
import { DEMO_ASOCIATIE, DEMO_PET_MARKERS } from '@/shared/demo/demoData';

// evacuationApi offline-path tests (T218).

const ASOC = DEMO_ASOCIATIE.id;

beforeEach(() => {
  useEvacuationStore.setState({ byAsociatie: seedEvacuation(), fetchError: null });
});

describe('hydrateEvacuation', () => {
  it('is a no-op when Supabase is not configured (offline/CI)', async () => {
    const before = useEvacuationStore.getState().byAsociatie;
    await hydrateEvacuation(ASOC);
    expect(useEvacuationStore.getState().byAsociatie).toBe(before);
    expect(useEvacuationStore.getState().fetchError).toBeNull();
  });

  it('is a no-op when asociatieId is empty', async () => {
    const before = useEvacuationStore.getState().byAsociatie;
    await hydrateEvacuation('');
    expect(useEvacuationStore.getState().byAsociatie).toBe(before);
  });
});

describe('persistPetMarker', () => {
  it('upserts a marker synchronously for the demo asociatie', () => {
    const marker = { id: `pm-test`, asociatie_id: ASOC, apartment_id: 'ap-99', apartment_label: 'Ap. 99', species: '1 hamster', user_id: 'u-test' };
    persistPetMarker(ASOC, marker);
    const data = evacuationForAsociatie(useEvacuationStore.getState().byAsociatie, ASOC);
    expect(data.markers.some((m) => m.id === marker.id)).toBe(true);
  });
});

describe('removePetMarker', () => {
  it('removes a marker synchronously from the store', () => {
    const first = DEMO_PET_MARKERS[0];
    const before = evacuationForAsociatie(useEvacuationStore.getState().byAsociatie, ASOC).markers.length;
    removePetMarker(ASOC, first.user_id, first.apartment_id, first.id);
    const after = evacuationForAsociatie(useEvacuationStore.getState().byAsociatie, ASOC).markers.length;
    expect(after).toBe(before - 1);
  });
});
