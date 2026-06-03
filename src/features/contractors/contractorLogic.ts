import type { Contractor } from '@/shared/types/domain';
import { normalizeSearch } from '@/features/faq/faqLogic';
import { DEMO_ASOCIATIE, DEMO_CONTRACTORS } from '@/shared/demo/demoData';

/** A contractor needs a name and a specialty. */
export function isValidContractor(name: string, specialty: string): boolean {
  return name.trim().length > 0 && specialty.trim().length > 0;
}

/** Whether a rating value is within the allowed 0–5 range. */
export function isValidRating(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= 5;
}

/** Search by name or specialty (accent-insensitive). */
export function searchContractors(contractors: Contractor[], query: string): Contractor[] {
  const q = normalizeSearch(query.trim());
  if (!q) return contractors;
  return contractors.filter((c) => normalizeSearch(`${c.name} ${c.specialty}`).includes(q));
}

/** Optionally keep only available contractors. */
export function filterAvailable(contractors: Contractor[], onlyAvailable: boolean): Contractor[] {
  return onlyAvailable ? contractors.filter((c) => c.available) : contractors;
}

/** Sort by rating (highest first), then name. */
export function sortByRating(contractors: Contractor[]): Contractor[] {
  return [...contractors].sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name, 'ro'));
}

/** Fold a new rating into the running average, returning the updated pair. */
export function applyRating(
  contractor: Pick<Contractor, 'rating' | 'rating_count'>,
  value: number,
): { rating: number; rating_count: number } {
  const count = contractor.rating_count + 1;
  const rating = (contractor.rating * contractor.rating_count + value) / count;
  return { rating: Math.round(rating * 10) / 10, rating_count: count };
}

// ── Per-asociatie contractor catalog ─────────────────────────────────────────

export type ContractorsByAsociatie = Record<string, Contractor[]>;

const EMPTY_CONTRACTORS: Contractor[] = [];

export function contractorsForAsociatie(
  map: ContractorsByAsociatie,
  asociatieId: string | null,
): Contractor[] {
  if (!asociatieId) return EMPTY_CONTRACTORS;
  return map[asociatieId] ?? EMPTY_CONTRACTORS;
}

export function seedContractors(): ContractorsByAsociatie {
  return { [DEMO_ASOCIATIE.id]: [...DEMO_CONTRACTORS] };
}

export function addContractorIn(
  map: ContractorsByAsociatie,
  asociatieId: string,
  contractor: Contractor,
): ContractorsByAsociatie {
  const current = map[asociatieId] ?? [];
  return { ...map, [asociatieId]: [contractor, ...current] };
}

export function migrateContractorsState(persisted: unknown): ContractorsByAsociatie {
  const p = persisted as { byAsociatie?: ContractorsByAsociatie } | null;
  const existing = p?.byAsociatie ?? {};
  return { ...existing, [DEMO_ASOCIATIE.id]: [...DEMO_CONTRACTORS] };
}
