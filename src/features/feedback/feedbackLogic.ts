import type { FeedbackSentiment, PlatformFeedback } from '@/shared/types/domain';

/** Sentiments offered when submitting feedback about the platform. */
export const FEEDBACK_SENTIMENTS: FeedbackSentiment[] = ['idee', 'problema', 'lauda'];

/** Minimum body length for a useful piece of feedback. */
export const MIN_FEEDBACK_LENGTH = 5;

/** Feedback needs a non-trivial body. */
export function isValidFeedback(body: string): boolean {
  return body.trim().length >= MIN_FEEDBACK_LENGTH;
}

/** Feedback newest-first. */
export function sortedFeedback(items: PlatformFeedback[]): PlatformFeedback[] {
  return [...items].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

// ── Per-asociatie feedback catalog ────────────────────────────────────────────

import { DEMO_ASOCIATIE, DEMO_FEEDBACK } from '@/shared/demo/demoData';
import { emptyArray } from '@/shared/lib/emptyArray';

export type FeedbackByAsociatie = Record<string, PlatformFeedback[]>;

const EMPTY_FEEDBACK = emptyArray<PlatformFeedback>();

export function feedbackForAsociatie(
  map: FeedbackByAsociatie,
  asociatieId: string | null,
): PlatformFeedback[] {
  if (!asociatieId) return EMPTY_FEEDBACK;
  return map[asociatieId] ?? EMPTY_FEEDBACK;
}

export function seedFeedback(): FeedbackByAsociatie {
  return { [DEMO_ASOCIATIE.id]: [...DEMO_FEEDBACK] };
}

export function addFeedbackIn(
  map: FeedbackByAsociatie,
  asociatieId: string,
  item: PlatformFeedback,
): FeedbackByAsociatie {
  const current = map[asociatieId] ?? [];
  return { ...map, [asociatieId]: [item, ...current] };
}

export function migrateFeedbackState(persisted: unknown): FeedbackByAsociatie {
  const p = persisted as { byAsociatie?: FeedbackByAsociatie } | null;
  const existing = p?.byAsociatie ?? {};
  return { ...existing, [DEMO_ASOCIATIE.id]: [...DEMO_FEEDBACK] };
}
