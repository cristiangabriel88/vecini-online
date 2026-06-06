import type { SitterProfile } from '@/shared/types/domain';
import { normalizeSearch } from '@/features/faq/faqLogic';

/** Sitting kinds offered on the board. */
export const SITTER_KINDS = ['babysitting', 'petsitting'] as const;

/** A profile needs at least a short availability note. */
export function isValidSitter(availability: string): boolean {
  return availability.trim().length >= 2;
}

/** Filter by kind ('all' = any) + free-text over name/availability/rate, by name. */
export function searchSitters(
  profiles: SitterProfile[],
  kind = 'all',
  query = '',
): SitterProfile[] {
  const q = normalizeSearch(query.trim());
  return profiles
    .filter((p) => (kind === 'all' ? true : p.kind === kind))
    .filter((p) =>
      q ? normalizeSearch(`${p.user_name} ${p.availability} ${p.rate}`).includes(q) : true,
    )
    .sort((a, b) => a.user_name.localeCompare(b.user_name, 'ro'));
}

// ── Per-asociatie sitter catalog ─────────────────────────────────────────────

import { DEMO_ASOCIATIE, DEMO_SITTERS } from '@/shared/demo/demoData';
import { emptyArray } from '@/shared/lib/emptyArray';

export type SittersByAsociatie = Record<string, SitterProfile[]>;

const EMPTY_SITTERS = emptyArray<SitterProfile>();

export function sittersForAsociatie(
  map: SittersByAsociatie,
  asociatieId: string | null,
): SitterProfile[] {
  if (!asociatieId) return EMPTY_SITTERS;
  return map[asociatieId] ?? EMPTY_SITTERS;
}

export function seedSitters(): SittersByAsociatie {
  return { [DEMO_ASOCIATIE.id]: [...DEMO_SITTERS] };
}

export function upsertSitterIn(
  map: SittersByAsociatie,
  asociatieId: string,
  profile: SitterProfile,
): SittersByAsociatie {
  const current = map[asociatieId] ?? [];
  const exists = current.some((p) => p.user_id === profile.user_id);
  const updated = exists
    ? current.map((p) => (p.user_id === profile.user_id ? profile : p))
    : [profile, ...current];
  return { ...map, [asociatieId]: updated };
}

export function removeSitterIn(
  map: SittersByAsociatie,
  asociatieId: string,
  userId: string,
): SittersByAsociatie {
  const current = map[asociatieId] ?? [];
  return { ...map, [asociatieId]: current.filter((p) => p.user_id !== userId) };
}

export function migrateSittersState(persisted: unknown): SittersByAsociatie {
  const p = persisted as { byAsociatie?: SittersByAsociatie } | null;
  const existing = p?.byAsociatie ?? {};
  return { ...existing, [DEMO_ASOCIATIE.id]: [...DEMO_SITTERS] };
}
