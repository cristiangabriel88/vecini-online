import type { KidsAgeBucket, KidsAgeRange, KidsEvent } from '@/shared/types/domain';

/** Canonical order of the age buckets, youngest first. */
export const AGE_BUCKETS: KidsAgeBucket[] = ['0-3', '4-6', '7-10', '11-14', '15-18'];

/** Buckets an event can target — any of the age buckets, or "all ages". */
export const EVENT_BUCKETS: (KidsAgeBucket | 'all')[] = ['all', ...AGE_BUCKETS];

/** A registration needs a known bucket and a whole-number count between 1 and 20. */
export function isValidRegistration(bucket: string, count: number): boolean {
  return (
    (AGE_BUCKETS as string[]).includes(bucket) &&
    Number.isInteger(count) &&
    count >= 1 &&
    count <= 20
  );
}

/**
 * The current resident's own registrations, in canonical bucket order. Used to
 * pre-fill the form and let a parent see what they've shared.
 */
export function myRanges(ranges: KidsAgeRange[], userId: string): KidsAgeRange[] {
  return ranges
    .filter((r) => r.user_id === userId)
    .sort((a, b) => AGE_BUCKETS.indexOf(a.bucket) - AGE_BUCKETS.indexOf(b.bucket));
}

/**
 * Privacy-preserving aggregate: total children per bucket across all parents,
 * in canonical order, omitting empty buckets. No identities are exposed.
 */
export function aggregateByBucket(ranges: KidsAgeRange[]): { bucket: KidsAgeBucket; count: number }[] {
  return AGE_BUCKETS.map((bucket) => ({
    bucket,
    count: ranges.filter((r) => r.bucket === bucket).reduce((sum, r) => sum + r.count, 0),
  })).filter((b) => b.count > 0);
}

/** Total number of registered children in the building. */
export function totalKids(ranges: KidsAgeRange[]): number {
  return ranges.reduce((sum, r) => sum + r.count, 0);
}

/** An activity needs a 3+ char title and a date. */
export function isValidEvent(title: string, date: string): boolean {
  return title.trim().length >= 3 && date.trim().length > 0;
}

/** True when the activity is today or later (dates are ISO YYYY-MM-DD, so string compare is safe). */
export function isUpcoming(event: KidsEvent, today: string): boolean {
  return event.date >= today;
}

/**
 * Split activities into upcoming (soonest first) and past (most recent first)
 * relative to `today`.
 */
export function splitEvents(
  events: KidsEvent[],
  today: string,
): { upcoming: KidsEvent[]; past: KidsEvent[] } {
  const upcoming = events
    .filter((e) => isUpcoming(e, today))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id.localeCompare(b.id)));
  const past = events
    .filter((e) => !isUpcoming(e, today))
    .sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : a.id.localeCompare(b.id)));
  return { upcoming, past };
}

/** How many parents are coming, counting the current resident if they've joined. */
export function goingCount(event: KidsEvent, joined: boolean): number {
  return event.interested + (joined ? 1 : 0);
}

// ── Per-asociatie kids catalog ────────────────────────────────────────────────

import { DEMO_ASOCIATIE, DEMO_KIDS_RANGES, DEMO_KIDS_EVENTS } from '@/shared/demo/demoData';
import { assertAggregateOnly, KIDS_AGE_RANGE_FIELDS } from '@/shared/lib/minorsGuard';

export interface KidsCatalog {
  ranges: KidsAgeRange[];
  events: KidsEvent[];
}

export type KidsByAsociatie = Record<string, KidsCatalog>;

const EMPTY_CATALOG: KidsCatalog = { ranges: [], events: [] };

export function kidsForAsociatie(
  map: KidsByAsociatie,
  asociatieId: string | null,
): KidsCatalog {
  if (!asociatieId) return EMPTY_CATALOG;
  return map[asociatieId] ?? EMPTY_CATALOG;
}

export function seedKids(): KidsByAsociatie {
  return {
    [DEMO_ASOCIATIE.id]: {
      ranges: [...DEMO_KIDS_RANGES],
      events: [...DEMO_KIDS_EVENTS],
    },
  };
}

export function upsertRangeIn(
  map: KidsByAsociatie,
  asociatieId: string,
  range: KidsAgeRange,
): KidsByAsociatie {
  assertAggregateOnly(range, KIDS_AGE_RANGE_FIELDS, 'kids_age_ranges');
  const cat = map[asociatieId] ?? EMPTY_CATALOG;
  const exists = cat.ranges.some(
    (r) => r.user_id === range.user_id && r.bucket === range.bucket,
  );
  const ranges = exists
    ? cat.ranges.map((r) =>
        r.user_id === range.user_id && r.bucket === range.bucket ? range : r,
      )
    : [...cat.ranges, range];
  return { ...map, [asociatieId]: { ...cat, ranges } };
}

export function removeRangeIn(
  map: KidsByAsociatie,
  asociatieId: string,
  userId: string,
  bucket: KidsAgeBucket,
): KidsByAsociatie {
  const cat = map[asociatieId] ?? EMPTY_CATALOG;
  return {
    ...map,
    [asociatieId]: {
      ...cat,
      ranges: cat.ranges.filter((r) => !(r.user_id === userId && r.bucket === bucket)),
    },
  };
}

export function addEventIn(
  map: KidsByAsociatie,
  asociatieId: string,
  event: KidsEvent,
): KidsByAsociatie {
  const cat = map[asociatieId] ?? EMPTY_CATALOG;
  return { ...map, [asociatieId]: { ...cat, events: [...cat.events, event] } };
}

export function removeEventIn(
  map: KidsByAsociatie,
  asociatieId: string,
  eventId: string,
): KidsByAsociatie {
  const cat = map[asociatieId] ?? EMPTY_CATALOG;
  return {
    ...map,
    [asociatieId]: { ...cat, events: cat.events.filter((e) => e.id !== eventId) },
  };
}

export function migrateKidsState(persisted: unknown): KidsByAsociatie {
  const p = persisted as { byAsociatie?: KidsByAsociatie } | null;
  const existing = p?.byAsociatie ?? {};
  return {
    ...existing,
    [DEMO_ASOCIATIE.id]: {
      ranges: [...DEMO_KIDS_RANGES],
      events: [...DEMO_KIDS_EVENTS],
    },
  };
}
