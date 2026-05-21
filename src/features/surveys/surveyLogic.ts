import type { SurveyTally } from '@/shared/types/domain';

/** Total responses recorded for a survey. */
export function totalResponses(tally: SurveyTally): number {
  return Object.values(tally).reduce((sum, n) => sum + n, 0);
}

/** Percentage (0–100, rounded) of responses for one option. */
export function optionPercent(tally: SurveyTally, option: string): number {
  const total = totalResponses(tally);
  if (total === 0) return 0;
  return Math.round(((tally[option] ?? 0) / total) * 100);
}

/** Whether a survey has passed its closing date. Open-ended surveys never close. */
export function isSurveyClosed(closesAt: string | null, now: Date = new Date()): boolean {
  return closesAt !== null && new Date(closesAt).getTime() <= now.getTime();
}
