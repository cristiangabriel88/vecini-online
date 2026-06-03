import type { Meter, MeterKind, MeterReading } from '@/shared/types/domain';
import { DEMO_ASOCIATIE, DEMO_METERS, DEMO_METER_READINGS } from '@/shared/demo/demoData';

/** Per-asociatie meter catalog (meters + most-recent readings). */
export interface MeterCatalog {
  meters: Meter[];
  readings: MeterReading[];
}

/** Every asociatie's meter catalog, keyed by asociatie id. */
export type MetersByAsociatie = Record<string, MeterCatalog>;

const EMPTY_CATALOG: MeterCatalog = Object.freeze({ meters: [], readings: [] });

/** Get the meter catalog for one asociatie (never null). */
export function metersForAsociatie(
  map: MetersByAsociatie,
  asociatieId: string | null,
): MeterCatalog {
  if (!asociatieId) return EMPTY_CATALOG;
  return map[asociatieId] ?? EMPTY_CATALOG;
}

/** Initial store state: the demo asociatie is seeded. */
export function seedMeters(): MetersByAsociatie {
  return {
    [DEMO_ASOCIATIE.id]: {
      meters: [...DEMO_METERS],
      readings: [...DEMO_METER_READINGS],
    },
  };
}

/** Migrate persisted state; always reseeds the demo asociatie. */
export function migrateMetersState(persisted: unknown): MetersByAsociatie {
  const p = persisted as { byAsociatie?: MetersByAsociatie } | null;
  const existing = p?.byAsociatie ?? {};
  return {
    ...existing,
    [DEMO_ASOCIATIE.id]: {
      meters: [...DEMO_METERS],
      readings: [...DEMO_METER_READINGS],
    },
  };
}

/** Apply a new reading to a catalog: update the meter's last_value + prepend reading. */
export function applyReadingToCatalog(
  catalog: MeterCatalog,
  meterId: string,
  reading: MeterReading,
): MeterCatalog {
  return {
    meters: catalog.meters.map((m) =>
      m.id === meterId ? { ...m, last_value: reading.value } : m,
    ),
    readings: [reading, ...catalog.readings],
  };
}

export type ReadingError = 'not_a_number' | 'below_previous';

/** A reading must be a finite number not lower than the previous index. */
export function validateReading(
  value: number,
  previous: number,
): { ok: true } | { ok: false; reason: ReadingError } {
  if (!Number.isFinite(value)) return { ok: false, reason: 'not_a_number' };
  if (value < previous) return { ok: false, reason: 'below_previous' };
  return { ok: true };
}

/** Consumption implied by a new reading (never negative). */
export function consumption(value: number, previous: number): number {
  return Math.max(0, value - previous);
}

/** Typical monthly consumption per meter kind, used for anomaly detection. */
export const EXPECTED_MONTHLY: Record<MeterKind, number> = {
  apa_rece: 6,
  apa_calda: 4,
  gaz: 40,
  incalzire: 60,
};

/** Multiple of expected consumption above which a reading is flagged. */
export const ANOMALY_FACTOR = 3;

/** Flag a suspiciously large jump for admin review (does not block submission). */
export function isAnomaly(
  value: number,
  previous: number,
  expectedMonthly: number,
  factor: number = ANOMALY_FACTOR,
): boolean {
  if (expectedMonthly <= 0) return false;
  return consumption(value, previous) > expectedMonthly * factor;
}
