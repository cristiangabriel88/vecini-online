import type { EvacuationEquipment, EvacuationPlan, PetMarker } from '@/shared/types/domain';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { reportError } from '@/shared/lib/errorReporting';
import { useEvacuationStore } from './evacuationStore';

interface PlanRow {
  id: string;
  asociatie_id: string;
  scara: string | null;
  route: string | null;
  equipment: unknown;
  updated_at: string | null;
}

interface MarkerRow {
  id: string;
  asociatie_id: string;
  apartment_id: string | null;
  apartment_label: string | null;
  species: string | null;
  user_id: string | null;
}

function rowToPlan(row: PlanRow): EvacuationPlan {
  return {
    id: row.id,
    asociatie_id: row.asociatie_id,
    scara: row.scara ?? '',
    route: row.route ?? '',
    equipment: (Array.isArray(row.equipment) ? row.equipment : []) as EvacuationEquipment[],
    updated_at: row.updated_at ?? '',
  };
}

function rowToMarker(row: MarkerRow): PetMarker {
  return {
    id: row.id,
    asociatie_id: row.asociatie_id,
    apartment_id: row.apartment_id ?? '',
    apartment_label: row.apartment_label ?? '',
    species: row.species ?? '',
    user_id: row.user_id ?? '',
  };
}

/**
 * Hydrate evacuation plans and pet markers from the backend. No-op offline.
 */
export async function hydrateEvacuation(asociatieId: string): Promise<void> {
  if (!isSupabaseConfigured || !asociatieId) return;
  const store = useEvacuationStore.getState();
  try {
    const [plansRes, markersRes] = await Promise.all([
      supabase
        .from('evacuation_plans')
        .select('id, asociatie_id, scara, route, equipment, updated_at')
        .eq('asociatie_id', asociatieId)
        .order('scara', { ascending: true }),
      supabase
        .from('pet_markers')
        .select('id, asociatie_id, apartment_id, apartment_label, species, user_id')
        .eq('asociatie_id', asociatieId),
    ]);
    if (plansRes.error || markersRes.error) {
      const err = plansRes.error ?? markersRes.error;
      reportError(err ?? new Error('no data'), { source: 'evacuationApi.hydrate' });
      store.setFetchError('load');
      return;
    }
    store.setFetchError(null);
    store.replaceForAsociatie(asociatieId, {
      plans: (plansRes.data as PlanRow[]).map(rowToPlan),
      markers: (markersRes.data as MarkerRow[]).map(rowToMarker),
    });
  } catch (err) {
    reportError(err, { source: 'evacuationApi.hydrate' });
    store.setFetchError('load');
  }
}

/**
 * Persist a pet marker: update store synchronously then mirror to DB.
 */
export function persistPetMarker(asociatieId: string, marker: PetMarker): void {
  useEvacuationStore.getState().setMarker(asociatieId, marker);
  if (!isSupabaseConfigured) return;
  void (async () => {
    try {
      await supabase.from('pet_markers').upsert(
        {
          id: marker.id,
          asociatie_id: asociatieId,
          apartment_id: marker.apartment_id || null,
          apartment_label: marker.apartment_label || null,
          species: marker.species,
          user_id: marker.user_id || null,
        },
        { onConflict: 'id' },
      );
    } catch (err) {
      reportError(err, { source: 'evacuationApi.persistMarker' });
    }
  })();
}

/**
 * Remove the current user's pet marker from store and DB.
 */
export function removePetMarker(asociatieId: string, userId: string, apartmentId: string, markerId: string): void {
  useEvacuationStore.getState().clearMarker(asociatieId, userId, apartmentId);
  if (!isSupabaseConfigured) return;
  void (async () => {
    try {
      await supabase.from('pet_markers').delete().eq('id', markerId);
    } catch (err) {
      reportError(err, { source: 'evacuationApi.removeMarker' });
    }
  })();
}
