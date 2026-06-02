import type { Role, Survey, SurveyTally } from '@/shared/types/domain';
import { DEMO_ASOCIATIE, DEMO_SURVEYS, DEMO_SURVEY_TALLIES } from '@/shared/demo/demoData';

/** Total responses recorded for a survey. */
export function totalResponses(tally: SurveyTally): number {
  return Object.values(tally).reduce((sum, n) => sum + n, 0);
}

/** Percentage (0-100, rounded) of responses for one option. */
export function optionPercent(tally: SurveyTally, option: string): number {
  const total = totalResponses(tally);
  if (total === 0) return 0;
  return Math.round(((tally[option] ?? 0) / total) * 100);
}

/** Whether a survey has passed its closing date. Open-ended surveys never close. */
export function isSurveyClosed(closesAt: string | null, now: Date = new Date()): boolean {
  return closesAt !== null && new Date(closesAt).getTime() <= now.getTime();
}

/** Only admin/presedinte/comitet can create or manage surveys. */
export function canManageSurveys(role: Role | null): boolean {
  return role === 'admin' || role === 'presedinte' || role === 'comitet';
}

// ── Per-asociație catalog ────────────────────────────────────────────────────

export interface SurveyCatalog {
  surveys: Survey[];
  tallies: Record<string, SurveyTally>;
}

export type SurveysByAsociatie = Record<string, SurveyCatalog>;

const EMPTY_CATALOG: SurveyCatalog = Object.freeze({
  surveys: [] as Survey[],
  tallies: {} as Record<string, SurveyTally>,
});

function cloneCatalog(surveys: Survey[], tallies: Record<string, SurveyTally>): SurveyCatalog {
  return {
    surveys: surveys.map((s) => ({ ...s })),
    tallies: Object.fromEntries(Object.entries(tallies).map(([k, v]) => [k, { ...v }])),
  };
}

/** Initial store state: the demo asociație gets the seeded surveys + tallies. */
export function seedSurveys(): SurveysByAsociatie {
  return {
    [DEMO_ASOCIATIE.id]: cloneCatalog(DEMO_SURVEYS, DEMO_SURVEY_TALLIES),
  };
}

/** The survey catalog for one asociație (stable empty reference, never null). */
export function surveysForAsociatie(
  map: SurveysByAsociatie,
  asociatieId: string | null,
): SurveyCatalog {
  if (!asociatieId) return EMPTY_CATALOG;
  return map[asociatieId] ?? EMPTY_CATALOG;
}

/**
 * Migrate persisted state to the current shape. Preserves non-demo asociații
 * and always reseeds the demo asociație so stale demo content is refreshed.
 */
export function migrateSurveysState(persisted: unknown): SurveysByAsociatie {
  const p = persisted as { byAsociatie?: SurveysByAsociatie } | null;
  const existing = p?.byAsociatie ?? {};
  return {
    ...existing,
    [DEMO_ASOCIATIE.id]: cloneCatalog(DEMO_SURVEYS, DEMO_SURVEY_TALLIES),
  };
}
