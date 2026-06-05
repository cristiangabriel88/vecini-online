import type { Petition, Role } from '@/shared/types/domain';
import { DEMO_ASOCIATIE, DEMO_PETITIONS } from '@/shared/demo/demoData';
import { isGovernanceRole } from '@/shared/lib/roleUtils';

/** A petition needs a short title and a body. */
export function isValidPetition(title: string, body: string): boolean {
  return title.trim().length >= 3 && body.trim().length >= 5;
}

/** Number of signatures required to forward the petition to the comitet. */
export function thresholdCount(p: Petition): number {
  return Math.ceil((p.threshold_percent / 100) * p.total_apartments);
}

/** Whether the petition has gathered enough signatures to be forwarded. */
export function isThresholdReached(p: Petition): boolean {
  return p.signatures >= thresholdCount(p);
}

/** Progress toward the threshold, clamped to 0–1. */
export function progress(p: Petition): number {
  const target = thresholdCount(p);
  if (target <= 0) return 1;
  return Math.min(1, p.signatures / target);
}

/** Sort petitions newest first. */
export function sortPetitions(petitions: Petition[]): Petition[] {
  return [...petitions].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

/** Only admin/presedinte/comitet can manage (archive/respond to) petitions. */
export function canManagePetitions(role: Role | null): boolean {
  return isGovernanceRole(role);
}

// ── Per-asociație catalog ────────────────────────────────────────────────────

export interface PetitionCatalog {
  items: Petition[];
}

export type PetitionsByAsociatie = Record<string, PetitionCatalog>;

const EMPTY_CATALOG: PetitionCatalog = Object.freeze({ items: [] as Petition[] });

function clonePetitions(items: Petition[]): Petition[] {
  return items.map((p) => ({ ...p }));
}

/** Initial store state: the demo asociație gets the seeded petitions. */
export function seedPetitions(): PetitionsByAsociatie {
  return { [DEMO_ASOCIATIE.id]: { items: clonePetitions(DEMO_PETITIONS) } };
}

/** The petition catalog for one asociație (stable reference, never null). */
export function petitionsForAsociatie(
  map: PetitionsByAsociatie,
  asociatieId: string | null,
): PetitionCatalog {
  if (!asociatieId) return EMPTY_CATALOG;
  return map[asociatieId] ?? EMPTY_CATALOG;
}

/**
 * Migrate persisted state to the current shape. Preserves non-demo asociații
 * and always reseeds the demo asociație so stale demo content is refreshed.
 */
export function migratePetitionsState(persisted: unknown): PetitionsByAsociatie {
  const p = persisted as { byAsociatie?: PetitionsByAsociatie } | null;
  const existing = p?.byAsociatie ?? {};
  return { ...existing, [DEMO_ASOCIATIE.id]: { items: clonePetitions(DEMO_PETITIONS) } };
}

/** Build a new petition object for optimistic store insertion. */
export function newPetition(
  input: { title: string; body: string },
  asociatieId: string,
  authorUserId: string,
  authorName: string,
  totalApartments: number,
  now: Date = new Date(),
): Petition {
  return {
    id: `pt-${now.getTime()}`,
    asociatie_id: asociatieId,
    author_user_id: authorUserId,
    author_name: authorName,
    title: input.title.trim(),
    body: input.body.trim(),
    threshold_percent: 25,
    status: 'deschisa',
    created_at: now.toISOString(),
    signatures: 1,
    total_apartments: totalApartments,
  };
}

/** Prepend one petition to a catalog (returns a new catalog object). */
export function addPetitionIn(catalog: PetitionCatalog, petition: Petition): PetitionCatalog {
  return { items: [petition, ...catalog.items] };
}

/** Whether a petition already has a published official committee response. */
export function petitionHasResponse(p: Petition): boolean {
  return typeof p.response === 'string' && p.response.trim().length > 0;
}

/** A committee response must be at least 20 characters. */
export function isValidPetitionResponse(text: string): boolean {
  return text.trim().length >= 20;
}

/** Return a new catalog with the response applied to one petition. */
export function addPetitionResponse(
  catalog: PetitionCatalog,
  petitionId: string,
  response: string,
  respondedAt: string,
  respondedByName: string,
): PetitionCatalog {
  return {
    items: catalog.items.map((p) =>
      p.id !== petitionId
        ? p
        : { ...p, response, responded_at: respondedAt, responded_by_name: respondedByName },
    ),
  };
}
