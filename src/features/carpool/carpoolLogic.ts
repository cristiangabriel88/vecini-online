import type { CarpoolProfile } from '@/shared/types/domain';
import { normalizeSearch } from '@/features/faq/faqLogic';

/** A carpool profile needs a destination. */
export function isValidProfile(destination: string): boolean {
  return destination.trim().length >= 2;
}

/** Filter carpool profiles by free-text query over destination + schedule + name,
 *  alphabetically by destination. */
export function searchProfiles(profiles: CarpoolProfile[], query = ''): CarpoolProfile[] {
  const q = normalizeSearch(query.trim());
  return profiles
    .filter((p) =>
      q ? normalizeSearch(`${p.destination} ${p.schedule} ${p.user_name}`).includes(q) : true,
    )
    .sort((a, b) => a.destination.localeCompare(b.destination, 'ro'));
}

// ── Per-asociatie carpool catalog ────────────────────────────────────────────

import { DEMO_ASOCIATIE, DEMO_CARPOOL } from '@/shared/demo/demoData';
import { emptyArray } from '@/shared/lib/emptyArray';

export type CarpoolsByAsociatie = Record<string, CarpoolProfile[]>;

const EMPTY_CARPOOL = emptyArray<CarpoolProfile>();

export function carpoolForAsociatie(
  map: CarpoolsByAsociatie,
  asociatieId: string | null,
): CarpoolProfile[] {
  if (!asociatieId) return EMPTY_CARPOOL;
  return map[asociatieId] ?? EMPTY_CARPOOL;
}

export function seedCarpool(): CarpoolsByAsociatie {
  return { [DEMO_ASOCIATIE.id]: [...DEMO_CARPOOL] };
}

export function upsertCarpoolIn(
  map: CarpoolsByAsociatie,
  asociatieId: string,
  profile: CarpoolProfile,
): CarpoolsByAsociatie {
  const current = map[asociatieId] ?? [];
  const exists = current.some((p) => p.user_id === profile.user_id);
  const updated = exists
    ? current.map((p) => (p.user_id === profile.user_id ? profile : p))
    : [profile, ...current];
  return { ...map, [asociatieId]: updated };
}

export function removeCarpoolIn(
  map: CarpoolsByAsociatie,
  asociatieId: string,
  userId: string,
): CarpoolsByAsociatie {
  const current = map[asociatieId] ?? [];
  return { ...map, [asociatieId]: current.filter((p) => p.user_id !== userId) };
}

export function migrateCarpoolState(persisted: unknown): CarpoolsByAsociatie {
  const p = persisted as { byAsociatie?: CarpoolsByAsociatie } | null;
  const existing = p?.byAsociatie ?? {};
  return { ...existing, [DEMO_ASOCIATIE.id]: [...DEMO_CARPOOL] };
}
