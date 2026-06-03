import type { Pet } from '@/shared/types/domain';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { reportError } from '@/shared/lib/errorReporting';
import { usePetsStore } from './petsStore';

interface PetRow {
  id: string;
  asociatie_id: string;
  owner_user_id: string | null;
  owner_name: string | null;
  name: string | null;
  species: string | null;
  photo_path: string | null;
  emergency_contact: string | null;
  lost: boolean;
  created_at: string;
}

function rowToPet(row: PetRow): Pet {
  return {
    id: row.id,
    asociatie_id: row.asociatie_id,
    owner_user_id: row.owner_user_id ?? '',
    owner_name: row.owner_name ?? '',
    name: row.name ?? '',
    species: row.species ?? '',
    photo_path: row.photo_path,
    emergency_contact: row.emergency_contact,
    lost: row.lost,
    created_at: row.created_at,
  };
}

/**
 * Hydrate one asociatie's pets from the backend. Reads `pets` ordered by
 * `created_at` descending. No-op when the backend is absent or id is empty.
 */
export async function hydratePets(asociatieId: string): Promise<void> {
  if (!isSupabaseConfigured || !asociatieId) return;
  const store = usePetsStore.getState();
  try {
    const { data, error } = await supabase
      .from('pets')
      .select(
        'id, asociatie_id, owner_user_id, owner_name, name, species, photo_path, emergency_contact, lost, created_at',
      )
      .eq('asociatie_id', asociatieId)
      .order('created_at', { ascending: false });
    if (error || !data) {
      reportError(error ?? new Error('no data'), { source: 'petsApi.hydrate' });
      store.setFetchError('load');
      return;
    }
    store.setFetchError(null);
    store.replaceForAsociatie(asociatieId, (data as PetRow[]).map(rowToPet));
  } catch (err) {
    reportError(err, { source: 'petsApi.hydrate' });
    store.setFetchError('load');
  }
}

/**
 * Add a pet: apply to the store synchronously then mirror an insert
 * to `pets` behind `isSupabaseConfigured`.
 */
export function addPetLive(asociatieId: string, pet: Pet): void {
  usePetsStore.getState().addPet(asociatieId, pet);
  if (!isSupabaseConfigured) return;
  void (async () => {
    try {
      await supabase.from('pets').insert({
        id: pet.id,
        asociatie_id: asociatieId,
        owner_user_id: pet.owner_user_id,
        owner_name: pet.owner_name,
        name: pet.name,
        species: pet.species,
        photo_path: pet.photo_path,
        emergency_contact: pet.emergency_contact,
        lost: pet.lost,
      });
    } catch (err) {
      reportError(err, { source: 'petsApi.add' });
    }
  })();
}

/**
 * Toggle the lost flag on a pet: apply to the store synchronously then mirror
 * an update to `pets` behind `isSupabaseConfigured`.
 */
export function togglePetLostLive(asociatieId: string, petId: string, newLost: boolean): void {
  usePetsStore.getState().toggleLost(asociatieId, petId);
  if (!isSupabaseConfigured) return;
  void (async () => {
    try {
      await supabase.from('pets').update({ lost: newLost }).eq('id', petId);
    } catch (err) {
      reportError(err, { source: 'petsApi.toggleLost' });
    }
  })();
}
