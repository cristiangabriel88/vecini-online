import { describe, expect, it } from 'vitest';
import {
  AGE_BUCKETS,
  EVENT_BUCKETS,
  aggregateByBucket,
  goingCount,
  isUpcoming,
  isValidEvent,
  isValidRegistration,
  myRanges,
  splitEvents,
  totalKids,
} from '@/features/kids/kidsLogic';
import type { KidsAgeRange, KidsEvent } from '@/shared/types/domain';

const range = (id: string, user_id: string, bucket: KidsAgeRange['bucket'], count: number): KidsAgeRange => ({
  id,
  asociatie_id: 'a',
  user_id,
  bucket,
  count,
});

const event = (id: string, date: string, interested = 0): KidsEvent => ({
  id,
  asociatie_id: 'a',
  title: `Activitate ${id}`,
  date,
  time: '17:00',
  location: 'Curte',
  bucket: 'all',
  note: '',
  interested,
  organizer_user_id: 'u1',
  organizer_name: 'Org',
  created_at: '2026-05-01T00:00:00Z',
});

describe('constants', () => {
  it('EVENT_BUCKETS prefixes the age buckets with "all"', () => {
    expect(EVENT_BUCKETS).toEqual(['all', ...AGE_BUCKETS]);
  });
});

describe('isValidRegistration', () => {
  it('requires a known bucket and a whole count in 1..20', () => {
    expect(isValidRegistration('4-6', 2)).toBe(true);
    expect(isValidRegistration('4-6', 0)).toBe(false);
    expect(isValidRegistration('4-6', 21)).toBe(false);
    expect(isValidRegistration('4-6', 1.5)).toBe(false);
    expect(isValidRegistration('99-100', 1)).toBe(false);
  });
});

describe('myRanges', () => {
  it('returns only the given user, in canonical bucket order', () => {
    const ranges = [range('a', 'u1', '7-10', 1), range('b', 'u2', '4-6', 1), range('c', 'u1', '0-3', 1)];
    expect(myRanges(ranges, 'u1').map((r) => r.bucket)).toEqual(['0-3', '7-10']);
  });
});

describe('aggregateByBucket', () => {
  it('sums counts per bucket in order, omitting empty buckets and hiding identities', () => {
    const ranges = [
      range('a', 'u1', '4-6', 1),
      range('b', 'u2', '4-6', 2),
      range('c', 'u3', '0-3', 1),
    ];
    expect(aggregateByBucket(ranges)).toEqual([
      { bucket: '0-3', count: 1 },
      { bucket: '4-6', count: 3 },
    ]);
  });
});

describe('totalKids', () => {
  it('sums every registration', () => {
    expect(totalKids([range('a', 'u1', '4-6', 1), range('b', 'u2', '7-10', 3)])).toBe(4);
    expect(totalKids([])).toBe(0);
  });
});

describe('isValidEvent', () => {
  it('requires a 3+ char title and a date', () => {
    expect(isValidEvent('Săniuș', '2026-06-01')).toBe(true);
    expect(isValidEvent('ab', '2026-06-01')).toBe(false);
    expect(isValidEvent('Săniuș', '')).toBe(false);
  });
});

describe('isUpcoming / splitEvents', () => {
  it('treats today as upcoming', () => {
    expect(isUpcoming(event('x', '2026-05-22'), '2026-05-22')).toBe(true);
    expect(isUpcoming(event('x', '2026-05-21'), '2026-05-22')).toBe(false);
  });

  it('sorts upcoming soonest-first and past most-recent-first', () => {
    const events = [
      event('a', '2026-05-30'),
      event('b', '2026-05-10'),
      event('c', '2026-05-25'),
      event('d', '2026-05-05'),
    ];
    const { upcoming, past } = splitEvents(events, '2026-05-22');
    expect(upcoming.map((e) => e.id)).toEqual(['c', 'a']);
    expect(past.map((e) => e.id)).toEqual(['b', 'd']);
  });
});

describe('goingCount', () => {
  it('adds the current resident when they have joined', () => {
    expect(goingCount(event('x', '2026-06-01', 3), false)).toBe(3);
    expect(goingCount(event('x', '2026-06-01', 3), true)).toBe(4);
  });
});
