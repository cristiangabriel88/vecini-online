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
