import { describe, expect, it } from 'vitest';
import type { BuildingEvent } from '@/shared/types/domain';
import {
  attendeeCount,
  buildEventIcs,
  escapeIcsText,
  eventsForAsociatie,
  groupByMonth,
  icsFileName,
  isAttending,
  isUpcoming,
  migrateEventsState,
  seedAttendees,
  seedEvents,
  sortByStart,
  splitEvents,
  toIcsDate,
  toggleRsvp,
} from '@/features/events/eventsLogic';
import { DEMO_EVENTS, DEMO_EVENT_ATTENDEES, DEMO_ASOCIATIE } from '@/shared/demo/demoData';

function ev(id: string, starts_at: string, over: Partial<BuildingEvent> = {}): BuildingEvent {
  return {
    id,
    asociatie_id: 'asoc-x',
    title: `Event ${id}`,
    description: null,
    location: null,
    starts_at,
    ends_at: null,
    category: null,
    created_by: 'u-1',
    created_at: '2026-01-01T00:00:00Z',
    ...over,
  };
}

describe('eventsLogic', () => {
  it('seeds the demo asociație with the seeded events', () => {
    expect(seedEvents()[DEMO_ASOCIATIE.id]).toEqual(DEMO_EVENTS);
  });

  it('seeds the attendee base counts from the demo data', () => {
    expect(seedAttendees()).toEqual(DEMO_EVENT_ATTENDEES);
  });

  it('returns the stored events for a known asociație', () => {
    expect(eventsForAsociatie(seedEvents(), DEMO_ASOCIATIE.id)).toEqual(DEMO_EVENTS);
  });

  it('returns a stable empty reference for unknown or null asociație', () => {
    const seed = seedEvents();
    expect(eventsForAsociatie(seed, 'x')).toBe(eventsForAsociatie(seed, 'y'));
    expect(eventsForAsociatie(seed, null)).toBe(eventsForAsociatie({}, null));
  });

  it('migrateEventsState preserves non-demo asociații and reseeds the demo one', () => {
    const a = ev('e-old', '2026-01-01T10:00:00Z');
    const migrated = migrateEventsState({ byAsociatie: { 'asoc-b': [a], [DEMO_ASOCIATIE.id]: [] } });
    expect(migrated['asoc-b']).toEqual([a]);
    expect(migrated[DEMO_ASOCIATIE.id]).toEqual(DEMO_EVENTS);
  });

  it('migrateEventsState falls back to the seed when nothing is persisted', () => {
    expect(migrateEventsState(null)).toEqual(seedEvents());
    expect(migrateEventsState({})).toEqual(seedEvents());
  });

  it('sortByStart orders ascending without mutating the input', () => {
    const input = [ev('b', '2026-03-01T10:00:00Z'), ev('a', '2026-01-01T10:00:00Z')];
    const snapshot = [...input];
    const sorted = sortByStart(input);
    expect(sorted.map((e) => e.id)).toEqual(['a', 'b']);
    expect(input).toEqual(snapshot);
  });

  it('isUpcoming uses the end time, then the start time', () => {
    const nowMs = Date.parse('2026-06-02T12:00:00Z');
    expect(isUpcoming(ev('a', '2026-06-01T08:00:00Z', { ends_at: '2026-06-03T08:00:00Z' }), nowMs)).toBe(true);
    expect(isUpcoming(ev('b', '2026-05-01T08:00:00Z'), nowMs)).toBe(false);
    expect(isUpcoming(ev('c', '2026-07-01T08:00:00Z'), nowMs)).toBe(true);
  });

  it('splitEvents partitions into ascending upcoming and recent-first past', () => {
    const nowMs = Date.parse('2026-06-02T12:00:00Z');
    const events = [
      ev('past1', '2026-04-01T10:00:00Z'),
      ev('past2', '2026-05-01T10:00:00Z'),
      ev('up1', '2026-07-01T10:00:00Z'),
      ev('up2', '2026-08-01T10:00:00Z'),
    ];
    const { upcoming, past } = splitEvents(events, nowMs);
    expect(upcoming.map((e) => e.id)).toEqual(['up1', 'up2']);
    expect(past.map((e) => e.id)).toEqual(['past2', 'past1']);
  });

  it('groupByMonth buckets ascending by calendar month', () => {
    const events = [
      ev('a', '2026-07-15T10:00:00Z'),
      ev('b', '2026-06-05T10:00:00Z'),
      ev('c', '2026-06-20T10:00:00Z'),
    ];
    const months = groupByMonth(events);
    expect(months.map((m) => m.key)).toEqual(['2026-06', '2026-07']);
    expect(months[0].events.map((e) => e.id)).toEqual(['b', 'c']);
    expect(months[1].events.map((e) => e.id)).toEqual(['a']);
  });

  it('toggleRsvp adds then removes, purely', () => {
    const empty = {};
    const on = toggleRsvp(empty, 'e1');
    expect(on).toEqual({ e1: true });
    expect(empty).toEqual({}); // input untouched
    expect(isAttending(on, 'e1')).toBe(true);
    const off = toggleRsvp(on, 'e1');
    expect(off).toEqual({});
    expect(isAttending(off, 'e1')).toBe(false);
  });

  it('attendeeCount adds the current resident only when attending', () => {
    expect(attendeeCount(7, false)).toBe(7);
    expect(attendeeCount(7, true)).toBe(8);
    expect(attendeeCount(0, true)).toBe(1);
  });

  it('toIcsDate renders a UTC ICS timestamp', () => {
    expect(toIcsDate('2026-06-05T18:00:00Z')).toBe('20260605T180000Z');
  });

  it('escapeIcsText escapes the RFC 5545 special characters', () => {
    expect(escapeIcsText('a, b; c\\ d\ne')).toBe('a\\, b\\; c\\\\ d\\ne');
  });

  it('buildEventIcs produces a valid single-VEVENT calendar with CRLF lines', () => {
    const event = ev('ev-1', '2026-06-05T18:00:00Z', {
      title: 'Adunarea Generală',
      description: 'Buget, lucrări',
      location: 'Hol, parter',
      ends_at: '2026-06-05T20:00:00Z',
      category: 'AGA',
      created_at: '2026-05-18T09:00:00Z',
    });
    const ics = buildEventIcs(event);
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR')).toBe(true);
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('UID:ev-1@vecini.online');
    expect(ics).toContain('DTSTAMP:20260518T090000Z');
    expect(ics).toContain('DTSTART:20260605T180000Z');
    expect(ics).toContain('DTEND:20260605T200000Z');
    expect(ics).toContain('SUMMARY:Adunarea Generală');
    expect(ics).toContain('LOCATION:Hol\\, parter');
    expect(ics).toContain('CATEGORIES:AGA');
  });

  it('buildEventIcs omits DTEND/DESCRIPTION/LOCATION when absent', () => {
    const ics = buildEventIcs(ev('e2', '2026-06-05T18:00:00Z'));
    expect(ics).not.toContain('DTEND:');
    expect(ics).not.toContain('DESCRIPTION:');
    expect(ics).not.toContain('LOCATION:');
  });

  it('icsFileName is a safe .ics name', () => {
    expect(icsFileName(ev('ev-1', '2026-06-05T18:00:00Z'))).toBe('eveniment-ev-1.ics');
  });
});
