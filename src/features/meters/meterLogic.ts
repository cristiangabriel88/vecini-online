import type { MeterKind } from '@/shared/types/domain';

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
