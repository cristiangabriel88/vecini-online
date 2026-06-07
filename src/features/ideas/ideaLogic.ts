import type { Idea, IdeaStatus, Role } from '@/shared/types/domain';
import { DEMO_ASOCIATIE, DEMO_IDEAS } from '@/shared/demo/demoData';
import { isGovernanceRole } from '@/shared/lib/roleUtils';
import { IDEA_TITLE_MAX, IDEA_BODY_MAX } from '@/shared/lib/contentGuard';

export { IDEA_TITLE_MAX, IDEA_BODY_MAX };

/** Default number of top ideas promoted to the committee agenda each quarter. */
export const PROMOTION_COUNT = 10;

/** A valid idea title: non-blank and within the length cap. */
export function isValidIdeaTitle(title: string): boolean {
  const t = title.trim();
  return t.length > 0 && t.length <= IDEA_TITLE_MAX;
}

/** A valid idea body: non-blank and within the length cap. */
export function isValidIdeaBody(body: string): boolean {
  const t = body.trim();
  return t.length > 0 && t.length <= IDEA_BODY_MAX;
}

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

/** Whether a given idea is among the top-N open ideas up for promotion. */
export function isPromoted(idea: Idea, allIdeas: Idea[], n: number = PROMOTION_COUNT): boolean {
  return idea.status === 'in_discutie' && topIdeas(allIdeas, n).some((i) => i.id === idea.id);
}

/** Only admin/presedinte/comitet can change idea status (approve/reject). */
export function canManageIdeas(role: Role | null): boolean {
  return isGovernanceRole(role);
}

export const IDEA_STATUS_TONE: Record<IdeaStatus, 'neutral' | 'primary' | 'success' | 'danger'> = {
  in_discutie: 'neutral',
  aprobat: 'primary',
  implementat: 'success',
  respins: 'danger',
};

// ── Per-asociație catalog ────────────────────────────────────────────────────

export interface IdeaCatalog {
  items: Idea[];
}

export type IdeasByAsociatie = Record<string, IdeaCatalog>;

const EMPTY_CATALOG: IdeaCatalog = Object.freeze({ items: [] as Idea[] });

function cloneIdeas(items: Idea[]): Idea[] {
  return items.map((i) => ({ ...i }));
}

/** Initial store state: the demo asociație gets the seeded ideas. */
export function seedIdeas(): IdeasByAsociatie {
  return { [DEMO_ASOCIATIE.id]: { items: cloneIdeas(DEMO_IDEAS) } };
}

/** The idea catalog for one asociație (stable reference, never null). */
export function ideasForAsociatie(
  map: IdeasByAsociatie,
  asociatieId: string | null,
): IdeaCatalog {
  if (!asociatieId) return EMPTY_CATALOG;
  return map[asociatieId] ?? EMPTY_CATALOG;
}

/**
 * Migrate persisted state to the current shape. Preserves non-demo asociații
 * and always reseeds the demo asociație so stale demo content is refreshed.
 */
export function migrateIdeasState(persisted: unknown): IdeasByAsociatie {
  const p = persisted as { byAsociatie?: IdeasByAsociatie } | null;
  const existing = p?.byAsociatie ?? {};
  return { ...existing, [DEMO_ASOCIATIE.id]: { items: cloneIdeas(DEMO_IDEAS) } };
}

/** Build a new idea object for optimistic store insertion. */
export function newIdea(
  input: { title: string; body: string },
  asociatieId: string,
  authorUserId: string,
  authorName: string,
  now: Date = new Date(),
): Idea {
  return {
    id: `idea-${now.getTime()}`,
    asociatie_id: asociatieId,
    author_user_id: authorUserId,
    author_name: authorName,
    title: input.title,
    body: input.body,
    status: 'in_discutie',
    votes: 1,
    created_at: now.toISOString(),
  };
}

/** Prepend one idea to a catalog (returns a new catalog object). */
export function addIdeaIn(catalog: IdeaCatalog, idea: Idea): IdeaCatalog {
  return { items: [idea, ...catalog.items] };
}
