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
