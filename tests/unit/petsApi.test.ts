import { beforeEach, describe, expect, it } from 'vitest';
import { usePetsStore } from '@/features/pets/petsStore';
import { hydratePets, addPetLive, togglePetLostLive } from '@/features/pets/petsApi';
import { petsForAsociatie, seedPets } from '@/features/pets/petLogic';
import { DEMO_ASOCIATIE, DEMO_PETS } from '@/shared/demo/demoData';
import type { Pet } from '@/shared/types/domain';

// petsApi offline-path tests (T216).
// Key contracts:
//   - hydratePets: no-op when not configured / empty id
//   - addPetLive: prepends synchronously, offline-safe
//   - togglePetLostLive: toggles lost flag synchronously, offline-safe

const ASOC = DEMO_ASOCIATIE.id;

function makePet(overrides?: Partial<Pet>): Pet {
  return {
    id: `pet-test-${Date.now()}`,
    asociatie_id: ASOC,
    owner_user_id: 'u-test',
    owner_name: 'Test Rezident',
    name: 'Rex',
    species: 'caine',
    photo_path: null,
    emergency_contact: null,
    lost: false,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  usePetsStore.setState({ byAsociatie: seedPets(), fetchError: null });
});

describe('hydratePets', () => {
  it('is a no-op when Supabase is not configured (offline/CI)', async () => {
    const before = usePetsStore.getState().byAsociatie;
    await hydratePets(ASOC);
    expect(usePetsStore.getState().byAsociatie).toBe(before);
    expect(usePetsStore.getState().fetchError).toBeNull();
  });

  it('is a no-op when asociatieId is empty', async () => {
    const before = usePetsStore.getState().byAsociatie;
    await hydratePets('');
    expect(usePetsStore.getState().byAsociatie).toBe(before);
  });
});

describe('addPetLive', () => {
  it('prepends the pet synchronously to the store', () => {
    const before = petsForAsociatie(usePetsStore.getState().byAsociatie, ASOC).length;
    const pet = makePet();
    addPetLive(ASOC, pet);
    const after = petsForAsociatie(usePetsStore.getState().byAsociatie, ASOC);
    expect(after).toHaveLength(before + 1);
    expect(after[0].id).toBe(pet.id);
  });

  it('preserves the demo pets after adding a new one', () => {
    addPetLive(ASOC, makePet());
    const after = petsForAsociatie(usePetsStore.getState().byAsociatie, ASOC);
    const demoIds = DEMO_PETS.map((p) => p.id);
    expect(after.filter((p) => demoIds.includes(p.id))).toHaveLength(DEMO_PETS.length);
  });
});

describe('togglePetLostLive', () => {
  it('toggles the lost flag synchronously', () => {
    const pet = makePet({ lost: false });
    addPetLive(ASOC, pet);
    togglePetLostLive(ASOC, pet.id, true);
    const after = petsForAsociatie(usePetsStore.getState().byAsociatie, ASOC);
    expect(after.find((p) => p.id === pet.id)?.lost).toBe(true);
  });
});
