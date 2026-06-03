import type { Meter, MeterKind, MeterReading } from '@/shared/types/domain';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { reportError } from '@/shared/lib/errorReporting';
import { useMetersStore } from './metersStore';

interface MeterRow {
  id: string;
  asociatie_id: string;
  apartment_id: string | null;
  kind: string | null;
  serial: string | null;
}

interface ReadingRow {
  id: string;
  asociatie_id: string;
  meter_id: string;
  value: number | null;
  photo_path: string | null;
  submitted_by: string | null;
  reading_date: string | null;
  created_at: string;
}

const VALID_KINDS = new Set<string>(['apa_rece', 'apa_calda', 'gaz', 'incalzire']);

function rowToMeter(row: MeterRow): Meter {
  return {
    id: row.id,
    asociatie_id: row.asociatie_id,
    apartment_id: row.apartment_id ?? '',
    kind: (VALID_KINDS.has(row.kind ?? '') ? row.kind : 'apa_rece') as MeterKind,
    serial: row.serial ?? '',
    last_value: 0,
  };
}

function rowToReading(row: ReadingRow): MeterReading {
  return {
    id: row.id,
    asociatie_id: row.asociatie_id,
    meter_id: row.meter_id,
    value: row.value ?? 0,
    photo_path: row.photo_path,
    submitted_by: row.submitted_by ?? '',
    reading_date: row.reading_date ?? '',
    created_at: row.created_at,
  };
}

/**
 * Hydrate one asociatie's meters and their most-recent readings from the
 * backend. Reads `meters` (all for the asociatie) and `meter_readings`
 * (most recent per meter, newest first). Sets each meter's `last_value` from
 * the most-recent reading. No-op when the backend is absent or the id is empty.
 */
export async function hydrateMeters(asociatieId: string): Promise<void> {
  if (!isSupabaseConfigured || !asociatieId) return;
  const store = useMetersStore.getState();
  try {
    const { data: meterRows, error: metersErr } = await supabase
      .from('meters')
      .select('id, asociatie_id, apartment_id, kind, serial')
      .eq('asociatie_id', asociatieId);
    if (metersErr || !meterRows) {
      reportError(metersErr ?? new Error('no data'), { source: 'metersApi.hydrate.meters' });
      store.setFetchError('load');
      return;
    }

    const meters = (meterRows as MeterRow[]).map(rowToMeter);
    const meterIds = meters.map((m) => m.id);

    let readings: MeterReading[] = [];
    if (meterIds.length > 0) {
      const { data: readingRows, error: readingsErr } = await supabase
        .from('meter_readings')
        .select('id, asociatie_id, meter_id, value, photo_path, submitted_by, reading_date, created_at')
        .in('meter_id', meterIds)
        .order('created_at', { ascending: false });
      if (!readingsErr && readingRows) {
        readings = (readingRows as ReadingRow[]).map(rowToReading);
      }
    }

    const lastValueByMeter: Record<string, number> = {};
    for (const r of readings) {
      if (!(r.meter_id in lastValueByMeter)) {
        lastValueByMeter[r.meter_id] = r.value;
      }
    }
    const metersWithValues = meters.map((m) => ({
      ...m,
      last_value: lastValueByMeter[m.id] ?? 0,
    }));

    store.setFetchError(null);
    store.replaceForAsociatie(asociatieId, metersWithValues, readings);
  } catch (err) {
    reportError(err, { source: 'metersApi.hydrate' });
    store.setFetchError('load');
  }
}

/**
 * Submit a meter reading: apply to the store synchronously (optimistic) then
 * mirror an insert into `meter_readings` (member-insert policy via T213
 * migration) behind `isSupabaseConfigured`.
 */
export function submitMeterReading(
  asociatieId: string,
  meterId: string,
  value: number,
  submittedBy: string,
): MeterReading {
  const reading: MeterReading = {
    id: `mrd-${Date.now()}`,
    asociatie_id: asociatieId,
    meter_id: meterId,
    value,
    photo_path: null,
    submitted_by: submittedBy,
    reading_date: new Date().toISOString().slice(0, 10),
    created_at: new Date().toISOString(),
  };
  useMetersStore.getState().submitReading(asociatieId, meterId, reading);
  if (isSupabaseConfigured) {
    void (async () => {
      try {
        await supabase.from('meter_readings').insert({
          asociatie_id: asociatieId,
          meter_id: meterId,
          value,
          submitted_by: submittedBy,
          reading_date: reading.reading_date,
        });
      } catch (err) {
        reportError(err, { source: 'metersApi.submit' });
      }
    })();
  }
  return reading;
}
