import { create } from 'zustand';
import type { Survey, SurveyTally } from '@/shared/types/domain';
import { DEMO_SURVEYS, DEMO_SURVEY_TALLIES } from '@/shared/demo/demoData';

interface SurveysState {
  surveys: Survey[];
  tallies: Record<string, SurveyTally>;
  /** Set of survey ids this user has already answered. */
  answered: string[];
  respond: (surveyId: string, option: string) => void;
}

export const useSurveysStore = create<SurveysState>((set) => ({
  surveys: [...DEMO_SURVEYS],
  tallies: structuredClone(DEMO_SURVEY_TALLIES),
  answered: [],
  respond: (surveyId, option) =>
    set((s) => {
      if (s.answered.includes(surveyId)) return s;
      const current = s.tallies[surveyId] ?? {};
      return {
        answered: [...s.answered, surveyId],
        tallies: {
          ...s.tallies,
          [surveyId]: { ...current, [option]: (current[option] ?? 0) + 1 },
        },
      };
    }),
}));
