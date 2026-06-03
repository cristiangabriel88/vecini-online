import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PlatformFeedback } from '@/shared/types/domain';
import { useAuthStore } from '@/shared/store/authStore';
import {
  type FeedbackByAsociatie,
  seedFeedback,
  feedbackForAsociatie,
  addFeedbackIn,
  migrateFeedbackState,
} from './feedbackLogic';

interface FeedbackState {
  byAsociatie: FeedbackByAsociatie;
  fetchError: string | null;
  addItem: (asociatieId: string, item: PlatformFeedback) => void;
  replaceForAsociatie: (asociatieId: string, items: PlatformFeedback[]) => void;
  setFetchError: (msg: string | null) => void;
}

export const useFeedbackStore = create<FeedbackState>()(
  persist(
    (set) => ({
      byAsociatie: seedFeedback(),
      fetchError: null,

      addItem: (asociatieId, item) =>
        set((s) => ({ byAsociatie: addFeedbackIn(s.byAsociatie, asociatieId, item) })),

      replaceForAsociatie: (asociatieId, items) =>
        set((s) => ({ byAsociatie: { ...s.byAsociatie, [asociatieId]: items } })),

      setFetchError: (msg) => set({ fetchError: msg }),
    }),
    {
      name: 'vecini.feedback',
      version: 1,
      partialize: (s) => ({ byAsociatie: s.byAsociatie }),
      migrate: (persisted) => ({ byAsociatie: migrateFeedbackState(persisted) }),
    },
  ),
);

export function useAsociatieFeedback(): PlatformFeedback[] {
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  return useFeedbackStore((s) => feedbackForAsociatie(s.byAsociatie, asociatieId));
}
