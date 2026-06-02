import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Survey, SurveyTally } from '@/shared/types/domain';
import { useAuthStore } from '@/shared/store/authStore';
import {
  type SurveyCatalog,
  type SurveysByAsociatie,
  migrateSurveysState,
  seedSurveys,
  surveysForAsociatie,
} from './surveyLogic';

interface SurveysState {
  /** Survey catalog (surveys + tallies) per asociație, keyed by asociație id. */
  byAsociatie: SurveysByAsociatie;
  /** This-device answered map: surveyId -> true when the user has responded. */
  answered: Record<string, boolean>;
  /** Non-null when the last live fetch failed; null in demo/offline or after success. */
  fetchError: string | null;
  /** Record a response: increment the choice in the tally and mark the survey answered. */
  respond: (asociatieId: string, surveyId: string, choice: string) => void;
  /** Replace one asociație's full survey list + tallies (used by live hydration). */
  replaceForAsociatie: (
    asociatieId: string,
    surveys: Survey[],
    tallies: Record<string, SurveyTally>,
  ) => void;
  /** Set or clear the live-fetch error (called by the API layer). */
  setFetchError: (msg: string | null) => void;
  /** The survey catalog for one asociație (stable reference). */
  forAsociatie: (asociatieId: string | null) => SurveyCatalog;
}

/**
 * Opinion surveys (F15) scoped per asociație (T195): the demo asociație is seeded
 * so the offline app is populated. Persisted so a recorded response survives
 * reload; version bumps reseed the demo asociație from DEMO_SURVEYS/DEMO_SURVEY_TALLIES
 * so stale demo content is refreshed. Live read via survey_tally RPC and write
 * against `survey_responses` under RLS is in `surveysApi.ts`; this store is the
 * synchronous source of truth the page reads.
 */
export const useSurveysStore = create<SurveysState>()(
  persist(
    (set, get) => ({
      byAsociatie: seedSurveys(),
      answered: {},
      fetchError: null,

      respond: (asociatieId, surveyId, choice) =>
        set((s) => {
          if (s.answered[surveyId]) return s;
          const catalog = surveysForAsociatie(s.byAsociatie, asociatieId);
          const current = catalog.tallies[surveyId] ?? {};
          return {
            answered: { ...s.answered, [surveyId]: true },
            byAsociatie: {
              ...s.byAsociatie,
              [asociatieId]: {
                ...catalog,
                tallies: {
                  ...catalog.tallies,
                  [surveyId]: { ...current, [choice]: (current[choice] ?? 0) + 1 },
                },
              },
            },
          };
        }),

      replaceForAsociatie: (asociatieId, surveys, tallies) =>
        set((s) => ({
          byAsociatie: { ...s.byAsociatie, [asociatieId]: { surveys, tallies } },
        })),

      setFetchError: (msg) => set({ fetchError: msg }),

      forAsociatie: (asociatieId) => surveysForAsociatie(get().byAsociatie, asociatieId),
    }),
    {
      name: 'vecini.surveys',
      version: 1,
      partialize: (s) => ({ byAsociatie: s.byAsociatie, answered: s.answered }),
      migrate: (persisted) => ({
        byAsociatie: migrateSurveysState(persisted),
        answered: (persisted as { answered?: Record<string, boolean> } | null)?.answered ?? {},
      }),
    },
  ),
);

/** Hook: the survey catalog for the currently active asociație. */
export function useAsociatieSurveys(): SurveyCatalog {
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  return useSurveysStore((s) => surveysForAsociatie(s.byAsociatie, asociatieId));
}
