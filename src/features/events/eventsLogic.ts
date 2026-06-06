import type { BuildingEvent } from '@/shared/types/domain';
import { DEMO_EVENTS, DEMO_EVENT_ATTENDEES, DEMO_ASOCIATIE } from '@/shared/demo/demoData';
import { emptyArray } from '@/shared/lib/emptyArray';

/**
 * Events calendar (F08, T185) scoped per asociație.
 *
 * Pure model so the demo store stays the offline source of truth and the loop
 * (comitet schedules, residents RSVP) works fully offline. Each asociație owns
 * its own list, keyed by asociație id, so an event belongs to the active tenant
 * and never leaks across asociații. With a real backend the list is hydrated
 * from `events` and RSVPs from `event_rsvps` under RLS (live activation in
 * `eventsApi.ts`); this module stays the single source of the shape, the
 * per-asociație partitioning, the chronological sort/grouping, the RSVP toggle
 * and the per-event ICS serialization.
 */

/** All asociații's events, keyed by asociație id. */
export type EventsByAsociatie = Record<string, BuildingEvent[]>;

/**
 * Stable empty list returned for an unknown or null asociație so React selectors
 * keep a constant reference (a fresh `[]` per call would force needless
 * re-renders). Never mutate it; the helpers always build a new array.
 */
const EMPTY_EVENTS = emptyArray<BuildingEvent>();

/**
 * Seed used the first time the store initialises (before any persisted state):
 * the demo asociație gets the seeded events so the offline app is populated.
 * Other asociații start empty until a comitet schedules one.
 */
export function seedEvents(): EventsByAsociatie {
  return { [DEMO_ASOCIATIE.id]: [...DEMO_EVENTS] };
}

/**
 * Seed for the attendee base counts (the residents already attending each
 * seeded demo event, keyed by event id). The displayed count for an event is
 * this base plus one when the current resident has RSVP'd. Unknown events start
 * at zero.
 */
export function seedAttendees(): Record<string, number> {
  return { ...DEMO_EVENT_ATTENDEES };
}

/**
 * The events for one asociație. Returns the stored list (a stable reference) or
 * a shared frozen empty list when the asociație has none yet or none is active.
 */
export function eventsForAsociatie(
  byAsociatie: EventsByAsociatie,
  asociatieId: string | null,
): BuildingEvent[] {
  if (!asociatieId) return EMPTY_EVENTS;
  return byAsociatie[asociatieId] ?? EMPTY_EVENTS;
}

/**
 * Migrate persisted state from any earlier version to the current shape.
 * Preserves non-demo asociații so a locally-created asociație keeps its events,
 * but always reseeds the demo asociație from `DEMO_EVENTS` so stale demo content
 * is refreshed on version bump.
 */
export function migrateEventsState(persisted: unknown): EventsByAsociatie {
  const state = persisted as { byAsociatie?: unknown } | null;
  const old = state?.byAsociatie;
  if (old && typeof old === 'object') {
    return { ...(old as EventsByAsociatie), [DEMO_ASOCIATIE.id]: [...DEMO_EVENTS] };
  }
  return seedEvents();
}

/** Chronological ascending sort by start time; pure (returns a new array). */
export function sortByStart(events: BuildingEvent[]): BuildingEvent[] {
  return [...events].sort(
    (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
  );
}

/**
 * Whether an event is still upcoming at `nowMs`: it has not yet ended (or, when
 * it has no end time, has not yet started).
 */
export function isUpcoming(event: BuildingEvent, nowMs: number): boolean {
  const endMs = new Date(event.ends_at ?? event.starts_at).getTime();
  return endMs >= nowMs;
}

/**
 * Split events into upcoming (ascending) and past (most-recent first) lists for
 * the agenda view. Pure and total over any input order.
 */
export function splitEvents(
  events: BuildingEvent[],
  nowMs: number,
): { upcoming: BuildingEvent[]; past: BuildingEvent[] } {
  const sorted = sortByStart(events);
  return {
    upcoming: sorted.filter((e) => isUpcoming(e, nowMs)),
    past: sorted.filter((e) => !isUpcoming(e, nowMs)).reverse(),
  };
}

/** A calendar month bucket of events for the month view. */
export interface EventMonth {
  /** Stable `YYYY-MM` key. */
  key: string;
  /** First day of the month (local), for header formatting in the page. */
  monthStart: string;
  /** The month's events, ascending by start time. */
  events: BuildingEvent[];
}

/**
 * Group events into calendar months (ascending), each month's events sorted
 * ascending. The `key` is `YYYY-MM` in the event's local time; `monthStart` is
 * the ISO of the month's first day so the page can format the header label.
 */
export function groupByMonth(events: BuildingEvent[]): EventMonth[] {
  const buckets = new Map<string, BuildingEvent[]>();
  for (const ev of sortByStart(events)) {
    const d = new Date(ev.starts_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const list = buckets.get(key);
    if (list) list.push(ev);
    else buckets.set(key, [ev]);
  }
  return [...buckets.entries()].map(([key, monthEvents]) => {
    const first = new Date(monthEvents[0].starts_at);
    return {
      key,
      monthStart: new Date(first.getFullYear(), first.getMonth(), 1).toISOString(),
      events: monthEvents,
    };
  });
}

/** Whether the current resident has RSVP'd to an event. */
export function isAttending(rsvps: Record<string, boolean>, eventId: string): boolean {
  return rsvps[eventId] === true;
}

/** Toggle the current resident's RSVP for an event; pure (returns a new map). */
export function toggleRsvp(
  rsvps: Record<string, boolean>,
  eventId: string,
): Record<string, boolean> {
  const next = { ...rsvps };
  if (next[eventId]) delete next[eventId];
  else next[eventId] = true;
  return next;
}

/**
 * The attendee count shown for an event: the seeded base (other residents
 * already attending) plus one when the current resident has RSVP'd.
 */
export function attendeeCount(base: number, attending: boolean): number {
  return base + (attending ? 1 : 0);
}

/* ── ICS (RFC 5545) per-event export ─────────────────────────────────────── */

/** Format a timestamp as an ICS UTC value `YYYYMMDDTHHMMSSZ`. */
export function toIcsDate(value: string): string {
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

/** Escape a text value for an ICS field (RFC 5545 §3.3.11). */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * Serialize one event as a single-VEVENT ICS calendar string (CRLF line breaks,
 * as required by RFC 5545). Pure so the page just downloads the returned text.
 */
export function buildEventIcs(event: BuildingEvent): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//vecini.online//Calendar//RO',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${event.id}@vecini.online`,
    `DTSTAMP:${toIcsDate(event.created_at)}`,
    `DTSTART:${toIcsDate(event.starts_at)}`,
  ];
  if (event.ends_at) lines.push(`DTEND:${toIcsDate(event.ends_at)}`);
  lines.push(`SUMMARY:${escapeIcsText(event.title)}`);
  if (event.description) lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
  if (event.location) lines.push(`LOCATION:${escapeIcsText(event.location)}`);
  if (event.category) lines.push(`CATEGORIES:${escapeIcsText(event.category)}`);
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return lines.join('\r\n');
}

/** A safe `.ics` filename for an event download. */
export function icsFileName(event: BuildingEvent): string {
  return `eveniment-${event.id}.ics`;
}
