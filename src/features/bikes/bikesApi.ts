import type { Bike } from '@/shared/types/domain';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { reportError } from '@/shared/lib/errorReporting';
import { runHydration } from '@/shared/lib/runHydration';
import { useBikesStore } from './bikesStore';

interface BikeRow {
  id: string;
  asociatie_id: string;
  owner_user_id: string | null;
  owner_name: string | null;
  description: string | null;
  serial: string | null;
  photo_path: string | null;
  abandoned: boolean;
  created_at: string;
}

function rowToBike(row: BikeRow): Bike {
  return {
    id: row.id,
    asociatie_id: row.asociatie_id,
    owner_user_id: row.owner_user_id ?? '',
    owner_name: row.owner_name ?? '',
    description: row.description ?? '',
    serial: row.serial,
    photo_path: row.photo_path,
    abandoned: row.abandoned,
    created_at: row.created_at,
  };
}

export async function hydrateBikes(asociatieId: string): Promise<void> {
  return runHydration<BikeRow, Bike>(asociatieId, {
    query: () =>
      supabase
        .from('bikes')
        .select('id, asociatie_id, owner_user_id, owner_name, description, serial, photo_path, abandoned, created_at')
        .eq('asociatie_id', asociatieId)
        .order('created_at', { ascending: false }),
    transform: rowToBike,
    store: useBikesStore.getState(),
    source: 'bikesApi.hydrate',
  });
}

/**
 * Add a bike: apply to the store synchronously then mirror an insert to
 * `bikes` behind `isSupabaseConfigured`.
 */
export function addBike(asociatieId: string, bike: Bike): void {
  useBikesStore.getState().addBike(asociatieId, bike);
  if (!isSupabaseConfigured) return;
  void (async () => {
    try {
      await supabase.from('bikes').insert({
        id: bike.id,
        asociatie_id: asociatieId,
        owner_user_id: bike.owner_user_id || null,
        owner_name: bike.owner_name,
        description: bike.description,
        serial: bike.serial,
        abandoned: bike.abandoned,
      });
    } catch (err) {
      reportError(err, { source: 'bikesApi.add' });
    }
  })();
}

/**
 * Toggle a bike's abandoned flag: apply to the store synchronously then
 * mirror an update to `bikes` behind `isSupabaseConfigured`.
 */
export function toggleBikeAbandoned(asociatieId: string, bike: Bike): void {
  useBikesStore.getState().toggleAbandoned(asociatieId, bike.id);
  if (!isSupabaseConfigured) return;
  void (async () => {
    try {
      await supabase
        .from('bikes')
        .update({ abandoned: !bike.abandoned })
        .eq('id', bike.id)
        .eq('asociatie_id', asociatieId);
    } catch (err) {
      reportError(err, { source: 'bikesApi.toggle' });
    }
  })();
}
