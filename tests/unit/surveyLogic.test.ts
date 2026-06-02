import { describe, expect, it } from 'vitest';
import {
  canManageSurveys,
  isSurveyClosed,
  migrateSurveysState,
  optionPercent,
  seedSurveys,
  surveysForAsociatie,
  totalResponses,
} from '@/features/surveys/surveyLogic';
import { DEMO_ASOCIATIE, DEMO_SURVEYS } from '@/shared/demo/demoData';

const tally = { Crem: 6, 'Gri deschis': 11, Teracotă: 3 };

describe('totalResponses', () => {
  it('sums all option counts', () => {
    expect(totalResponses(tally)).toBe(20);
    expect(totalResponses({})).toBe(0);
  });
});

describe('optionPercent', () => {
  it('rounds the share of an option', () => {
    expect(optionPercent(tally, 'Gri deschis')).toBe(55);
    expect(optionPercent(tally, 'Crem')).toBe(30);
  });

  it('returns 0 for an unknown option or empty tally', () => {
    expect(optionPercent(tally, 'Albastru')).toBe(0);
    expect(optionPercent({}, 'Crem')).toBe(0);
  });
});

describe('isSurveyClosed', () => {
  const now = new Date('2026-05-21T00:00:00Z');
  it('is open when there is no closing date', () => {
    expect(isSurveyClosed(null, now)).toBe(false);
  });
  it('compares the closing date to now', () => {
    expect(isSurveyClosed('2026-06-15T00:00:00Z', now)).toBe(false);
    expect(isSurveyClosed('2026-05-01T00:00:00Z', now)).toBe(true);
  });
});

describe('canManageSurveys', () => {
  it('returns true for admin, presedinte, comitet', () => {
    expect(canManageSurveys('admin')).toBe(true);
    expect(canManageSurveys('presedinte')).toBe(true);
    expect(canManageSurveys('comitet')).toBe(true);
  });
  it('returns false for proprietar, locatar, cenzor, null', () => {
    expect(canManageSurveys('proprietar')).toBe(false);
    expect(canManageSurveys('locatar')).toBe(false);
    expect(canManageSurveys('cenzor')).toBe(false);
    expect(canManageSurveys(null)).toBe(false);
  });
});

describe('seedSurveys', () => {
  it('seeds the demo asociație with the demo surveys', () => {
    const state = seedSurveys();
    const catalog = state[DEMO_ASOCIATIE.id];
    expect(catalog).toBeDefined();
    expect(catalog.surveys).toHaveLength(DEMO_SURVEYS.length);
    expect(catalog.surveys[0].id).toBe(DEMO_SURVEYS[0].id);
  });

  it('does not share references with the demo seed', () => {
    const a = seedSurveys();
    const b = seedSurveys();
    a[DEMO_ASOCIATIE.id].surveys[0].title = 'mutated';
    expect(b[DEMO_ASOCIATIE.id].surveys[0].title).not.toBe('mutated');
  });
});

describe('surveysForAsociatie', () => {
  it('returns the catalog for the demo asociație', () => {
    const state = seedSurveys();
    const catalog = surveysForAsociatie(state, DEMO_ASOCIATIE.id);
    expect(catalog.surveys.length).toBeGreaterThan(0);
  });

  it('returns an empty catalog for a null or unknown asociatieId', () => {
    const state = seedSurveys();
    expect(surveysForAsociatie(state, null).surveys).toHaveLength(0);
    expect(surveysForAsociatie(state, 'unknown').surveys).toHaveLength(0);
  });
});

describe('migrateSurveysState', () => {
  it('always reseeds the demo asociație', () => {
    const result = migrateSurveysState({ byAsociatie: {} });
    expect(result[DEMO_ASOCIATIE.id].surveys).toHaveLength(DEMO_SURVEYS.length);
  });

  it('preserves non-demo asociații', () => {
    const existing = { 'other-asoc': { surveys: [], tallies: {} } };
    const result = migrateSurveysState({ byAsociatie: existing });
    expect(result['other-asoc']).toBeDefined();
    expect(result[DEMO_ASOCIATIE.id]).toBeDefined();
  });

  it('handles null persisted state gracefully', () => {
    const result = migrateSurveysState(null);
    expect(result[DEMO_ASOCIATIE.id]).toBeDefined();
  });
});
