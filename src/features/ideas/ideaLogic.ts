import type { Idea, IdeaStatus } from '@/shared/types/domain';

/** Default number of top ideas promoted to the committee agenda each quarter. */
export const PROMOTION_COUNT = 10;

/** Ideas still open for discussion, ranked by votes (desc), then recency. */
export function rankIdeas(ideas: Idea[]): Idea[] {
  return [...ideas].sort(
    (a, b) =>
      b.votes - a.votes || new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

/** The top-N open ideas that would be promoted to the committee agenda. */
export function topIdeas(ideas: Idea[], n: number = PROMOTION_COUNT): Idea[] {
  return rankIdeas(ideas.filter((i) => i.status === 'in_discutie')).slice(0, n);
}

export const IDEA_STATUS_TONE: Record<IdeaStatus, 'neutral' | 'primary' | 'success' | 'danger'> = {
  in_discutie: 'neutral',
  aprobat: 'primary',
  implementat: 'success',
  respins: 'danger',
};
