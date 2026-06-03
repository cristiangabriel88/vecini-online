import type { ParkingSpot } from '@/shared/types/domain';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { reportError } from '@/shared/lib/errorReporting';
import { useParkingStore } from './parkingStore';

interface ParkingRow {
  id: string;
  asociatie_id: string;
  label: string | null;
  zone: string | null;
  is_visitor: boolean;
  apartment_label: string | null;
  license_plate: string | null;
}

function rowToSpot(row: ParkingRow): ParkingSpot {
  return {
    id: row.id,
    asociatie_id: row.asociatie_id,
    label: row.label ?? '',
    zone: row.zone,
    is_visitor: row.is_visitor,
    apartment_label: row.apartment_label,
    license_plate: row.license_plate,
  };
}

/**
 * Hydrate one asociatie's parking spots from the backend. Reads `parking_spots`
 * ordered by label. No-op when the backend is absent or the id is empty.
 */
export async function hydrateParking(asociatieId: string): Promise<void> {
  if (!isSupabaseConfigured || !asociatieId) return;
  const store = useParkingStore.getState();
  try {
    const { data, error } = await supabase
      .from('parking_spots')
      .select('id, asociatie_id, label, zone, is_visitor, apartment_label, license_plate')
      .eq('asociatie_id', asociatieId)
      .order('label');
    if (error || !data) {
      reportError(error ?? new Error('no data'), { source: 'parkingApi.hydrate' });
      store.setFetchError('load');
      return;
    }
    store.setFetchError(null);
    store.replaceForAsociatie(asociatieId, (data as ParkingRow[]).map(rowToSpot));
  } catch (err) {
    reportError(err, { source: 'parkingApi.hydrate' });
    store.setFetchError('load');
  }
}

/**
 * Add a parking spot: apply to the store synchronously then mirror an insert
 * to `parking_spots` behind `isSupabaseConfigured`.
 */
export function addParkingSpot(asociatieId: string, spot: ParkingSpot): void {
  useParkingStore.getState().addSpot(asociatieId, spot);
  if (!isSupabaseConfigured) return;
  void (async () => {
    try {
      await supabase.from('parking_spots').insert({
        id: spot.id,
        asociatie_id: asociatieId,
        label: spot.label,
        zone: spot.zone,
        is_visitor: spot.is_visitor,
        apartment_label: spot.apartment_label,
        license_plate: spot.license_plate,
      });
    } catch (err) {
      reportError(err, { source: 'parkingApi.add' });
    }
  })();
}
