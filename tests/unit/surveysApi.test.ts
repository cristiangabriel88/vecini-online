import { beforeEach, describe, expect, it } from 'vitest';
import { useSurveysStore } from '@/features/surveys/surveysStore';
import { hydrateSurveys, recordSurveyResponse } from '@/features/surveys/surveysApi';
import { seedSurveys, surveysForAsociatie } from '@/features/surveys/surveyLogic';
import { DEMO_ASOCIATIE, DEMO_SURVEYS } from '@/shared/demo/demoData';

// surveysApi offline-path tests (T195).
// Live-path tests require a real Supabase backend; CI exercises the offline path
// (isSupabaseConfigured === false). Key contracts:
//   - hydrateSurveys: no-op when not configured / empty id (store untouched)
//   - recordSurveyResponse: applies synchronously to the store, offline-safe
//   - idempotent: a second response for the same survey is ignored

const ASOC = DEMO_ASOCIATIE.id;

beforeEach(() => {
  useSurveysStore.setState({ byAsociatie: seedSurveys(), answered: {}, fetchError: null });
});

describe('hydrateSurveys', () => {
  it('is a no-op when Supabase is not configured (offline/CI)', async () => {
    const before = useSurveysStore.getState().byAsociatie;
    await hydrateSurveys(ASOC);
    expect(useSurveysStore.getState().byAsociatie).toBe(before);
    expect(useSurveysStore.getState().fetchError).toBeNull();
  });

  it('is a no-op when asociatieId is empty', async () => {
    const before = useSurveysStore.getState().byAsociatie;
    await hydrateSurveys('');
    expect(useSurveysStore.getState().byAsociatie).toBe(before);
  });
});

describe('recordSurveyResponse', () => {
  it('increments the chosen option in the tally and marks the survey answered', () => {
    const sv = DEMO_SURVEYS[0];
    const chosenOption = sv.options[0];
    const catalog = surveysForAsociatie(useSurveysStore.getState().byAsociatie, ASOC);
    const before = catalog.tallies[sv.id]?.[chosenOption] ?? 0;

    recordSurveyResponse(ASOC, sv.id, chosenOption, null);

    const after = surveysForAsociatie(useSurveysStore.getState().byAsociatie, ASOC);
    expect(after.tallies[sv.id]?.[chosenOption]).toBe(before + 1);
    expect(useSurveysStore.getState().answered[sv.id]).toBe(true);
  });

  it('is idempotent: a second response for the same survey is ignored', () => {
    const sv = DEMO_SURVEYS[0];
    const chosenOption = sv.options[0];
    recordSurveyResponse(ASOC, sv.id, chosenOption, null);
    const tally1 = { ...surveysForAsociatie(useSurveysStore.getState().byAsociatie, ASOC).tallies[sv.id] };

    recordSurveyResponse(ASOC, sv.id, sv.options[1], null);
    const tally2 = surveysForAsociatie(useSurveysStore.getState().byAsociatie, ASOC).tallies[sv.id];
    expect(tally2).toEqual(tally1);
  });

  it('records correctly for a second distinct survey', () => {
    const sv1 = DEMO_SURVEYS[0];
    const sv2 = DEMO_SURVEYS[1];
    recordSurveyResponse(ASOC, sv1.id, sv1.options[0], null);
    recordSurveyResponse(ASOC, sv2.id, sv2.options[0], null);
    expect(useSurveysStore.getState().answered[sv1.id]).toBe(true);
    expect(useSurveysStore.getState().answered[sv2.id]).toBe(true);
  });
});
