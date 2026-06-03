import type { SkillOffering } from '@/shared/types/domain';
import { normalizeSearch } from '@/features/faq/faqLogic';

/** An offering needs at least a short "offers" description. */
export function isValidOffering(offers: string): boolean {
  return offers.trim().length >= 3;
}

/** Filter offerings by free-text over name/offers/needs, sorted by name. */
export function searchOfferings(offerings: SkillOffering[], query = ''): SkillOffering[] {
  const q = normalizeSearch(query.trim());
  return offerings
    .filter((o) =>
      q ? normalizeSearch(`${o.user_name} ${o.offers} ${o.needs}`).includes(q) : true,
    )
    .sort((a, b) => a.user_name.localeCompare(b.user_name, 'ro'));
}

// ── Per-asociatie barter catalog ─────────────────────────────────────────────

import { DEMO_ASOCIATIE, DEMO_SKILLS } from '@/shared/demo/demoData';

export type BarterByAsociatie = Record<string, SkillOffering[]>;

const EMPTY_OFFERINGS: SkillOffering[] = [];

export function barterForAsociatie(
  map: BarterByAsociatie,
  asociatieId: string | null,
): SkillOffering[] {
  if (!asociatieId) return EMPTY_OFFERINGS;
  return map[asociatieId] ?? EMPTY_OFFERINGS;
}

export function seedBarter(): BarterByAsociatie {
  return { [DEMO_ASOCIATIE.id]: [...DEMO_SKILLS] };
}

export function upsertOfferingIn(
  map: BarterByAsociatie,
  asociatieId: string,
  offering: SkillOffering,
): BarterByAsociatie {
  const current = map[asociatieId] ?? [];
  const exists = current.some((o) => o.user_id === offering.user_id);
  const updated = exists
    ? current.map((o) => (o.user_id === offering.user_id ? offering : o))
    : [offering, ...current];
  return { ...map, [asociatieId]: updated };
}

export function removeOfferingIn(
  map: BarterByAsociatie,
  asociatieId: string,
  userId: string,
): BarterByAsociatie {
  const current = map[asociatieId] ?? [];
  return { ...map, [asociatieId]: current.filter((o) => o.user_id !== userId) };
}

export function migrateBarterState(persisted: unknown): BarterByAsociatie {
  const p = persisted as { byAsociatie?: BarterByAsociatie } | null;
  const existing = p?.byAsociatie ?? {};
  return { ...existing, [DEMO_ASOCIATIE.id]: [...DEMO_SKILLS] };
}
