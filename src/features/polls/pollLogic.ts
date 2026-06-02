import type { Apartment, MajorityRule, Poll, PollOption } from '@/shared/types/domain';
import {
  DEMO_ASOCIATIE,
  DEMO_POLLS,
  DEMO_POLL_OPTIONS,
  DEMO_VOTE_COUNTS,
} from '@/shared/demo/demoData';

/**
 * Selection-poll model (F09 Voturi).
 *
 * Pure helpers so the demo store stays the offline source of truth and the loop
 * (comitet opens a vote, members cast ballots, everyone sees the running tally)
 * works fully offline. Each asociație owns its own poll catalog, keyed by
 * asociație id, so a poll belongs to the active tenant and never leaks across
 * asociații. With a real backend the catalog is hydrated from `polls`/
 * `poll_options` and the running counts come from the attribution-free
 * `poll_tally` RPC (T80) -- a member never reads another member's ballot row.
 * Live read/write is in `pollsApi.ts`; this module stays the single source of
 * the per-asociație partitioning, the catalog shape and the tally rule.
 */

export interface TallyInput {
  /** votes (or weight) per option id */
  counts: Record<string, number>;
  yesOptionId: string;
  noOptionId?: string;
  totalApartments: number;
  quorumPercent: number;
  majorityRule: MajorityRule;
}

export interface TallyResult {
  total: number;
  quorumMet: boolean;
  passed: boolean;
  percentages: Record<string, number>;
}

/** Compute whether a yes/no proposal passes, given quorum and majority rule. */
export function tallyYesNo(input: TallyInput): TallyResult {
  const { counts, yesOptionId, noOptionId, totalApartments, quorumPercent, majorityRule } = input;
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const quorumMet = totalApartments === 0 ? false : (total / totalApartments) * 100 >= quorumPercent;

  const yes = counts[yesOptionId] ?? 0;
  const no = noOptionId ? (counts[noOptionId] ?? 0) : 0;

  let passed = false;
  if (quorumMet) {
    switch (majorityRule) {
      case 'simple':
        passed = yes > no;
        break;
      case 'absolute':
        passed = yes > totalApartments / 2;
        break;
      case 'qualified_2_3':
        passed = total > 0 && yes >= (2 / 3) * total;
        break;
    }
  }

  const percentages: Record<string, number> = {};
  for (const [id, c] of Object.entries(counts)) {
    percentages[id] = total === 0 ? 0 : Math.round((c / total) * 100);
  }

  return { total, quorumMet, passed, percentages };
}

/** One asociație's poll catalog: its polls and the options belonging to them. */
export interface PollCatalog {
  polls: Poll[];
  options: PollOption[];
}

/** Every asociație's poll catalog, keyed by asociație id. */
export type PollsByAsociatie = Record<string, PollCatalog>;

/**
 * Stable empty catalog returned for an unknown or null asociație so React
 * selectors keep a constant reference (a fresh object per call would force
 * needless re-renders). Never mutate it; the helpers always build new arrays.
 */
const EMPTY_CATALOG: PollCatalog = Object.freeze({
  polls: Object.freeze([] as Poll[]) as Poll[],
  options: Object.freeze([] as PollOption[]) as PollOption[],
});

/**
 * Seed used the first time the store initialises (before any persisted state):
 * the demo asociație gets the seeded poll catalog so the offline app is
 * populated. Other asociații start empty until a comitet opens a vote.
 */
export function seedPolls(): PollsByAsociatie {
  return {
    [DEMO_ASOCIATIE.id]: { polls: [...DEMO_POLLS], options: [...DEMO_POLL_OPTIONS] },
  };
}

/** Seed running vote counts (per option id) for the offline/demo app. */
export function seedVoteCounts(): Record<string, number> {
  return { ...DEMO_VOTE_COUNTS };
}

/**
 * The poll catalog for one asociație. Returns the stored catalog (a stable
 * reference) or a shared frozen empty catalog when the asociație has none yet or
 * none is active.
 */
export function catalogForAsociatie(
  byAsociatie: PollsByAsociatie,
  asociatieId: string | null,
): PollCatalog {
  if (!asociatieId) return EMPTY_CATALOG;
  return byAsociatie[asociatieId] ?? EMPTY_CATALOG;
}

/** The options for one poll, in ascending sort order. */
export function optionsForPoll(options: PollOption[], pollId: string): PollOption[] {
  return options
    .filter((o) => o.poll_id === pollId)
    .sort((a, b) => a.sort_order - b.sort_order);
}

/**
 * The number of apartments that count toward quorum for the active asociație:
 * the active apartments in the building. Replaces the old hardcoded 24 so the
 * quorum reflects the real building rather than a fixed demo size.
 */
export function quorumApartmentCount(apartments: Apartment[]): number {
  return apartments.reduce((total, apt) => total + (apt.is_active ? 1 : 0), 0);
}

/**
 * Resolve the apartment a voter casts from: the active apartment one of whose
 * persons is claimed by the voting user. Used only on the live write path, where
 * `votes.apartment_id` is required and is unique per (poll, apartment). Returns
 * null when the user is not linked to any apartment (offline never needs this).
 */
export function findVoterApartmentId(apartments: Apartment[], userId: string): string | null {
  const match = apartments.find(
    (apt) => apt.is_active && apt.persons.some((p) => p.claimed_user_id === userId),
  );
  return match?.id ?? null;
}

/** Apply one cast vote to the running counts, returning a new counts map. */
export function applyVote(
  counts: Record<string, number>,
  optionId: string,
): Record<string, number> {
  return { ...counts, [optionId]: (counts[optionId] ?? 0) + 1 };
}

/**
 * Migrate persisted state from any earlier version to the current shape.
 * Preserves non-demo asociații so a locally-created asociație keeps its polls,
 * but always reseeds the demo asociație from `DEMO_POLLS`/`DEMO_POLL_OPTIONS` so
 * stale demo content is refreshed on version bump.
 */
export function migratePollsState(persisted: unknown): PollsByAsociatie {
  const state = persisted as { byAsociatie?: unknown } | null;
  const old = state?.byAsociatie;
  if (old && typeof old === 'object') {
    return {
      ...(old as PollsByAsociatie),
      [DEMO_ASOCIATIE.id]: { polls: [...DEMO_POLLS], options: [...DEMO_POLL_OPTIONS] },
    };
  }
  return seedPolls();
}
