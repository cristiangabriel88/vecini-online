import { create } from 'zustand';
import type { KidsAgeBucket, KidsAgeRange, KidsEvent } from '@/shared/types/domain';
import { DEMO_KIDS_RANGES, DEMO_KIDS_EVENTS } from '@/shared/demo/demoData';
import {
  KIDS_AGE_RANGE_FIELDS,
  KIDS_EVENT_FIELDS,
  assertAggregateOnly,
} from '@/shared/lib/minorsGuard';

/** Demo identity of the signed-in resident (a parent). */
export const DEMO_USER = { id: 'u-res', name: 'Popescu Andrei' };

interface KidsState {
  ranges: KidsAgeRange[];
  events: KidsEvent[];
  /** Event ids the current resident has said they'll attend. */
  joinedIds: Set<string>;
  /** Upsert the current resident's count for a bucket. */
  registerKids: (bucket: KidsAgeBucket, count: number) => void;
  /** Remove one of the current resident's registrations. */
  removeRange: (bucket: KidsAgeBucket) => void;
  addEvent: (
    title: string,
    date: string,
    time: string,
    location: string,
    bucket: KidsAgeBucket | 'all',
    note: string,
  ) => void;
  removeEvent: (id: string) => void;
  toggleJoin: (id: string) => void;
}

export const useKidsStore = create<KidsState>((set) => ({
  ranges: [...DEMO_KIDS_RANGES],
  events: [...DEMO_KIDS_EVENTS],
  joinedIds: new Set<string>(),
  registerKids: (bucket, count) =>
    set((s) => {
      const existing = s.ranges.find((r) => r.user_id === DEMO_USER.id && r.bucket === bucket);
      if (existing) {
        const updated = { ...existing, count };
        assertAggregateOnly(updated, KIDS_AGE_RANGE_FIELDS, 'kids_age_ranges');
        return {
          ranges: s.ranges.map((r) => (r.id === existing.id ? updated : r)),
        };
      }
      const record: KidsAgeRange = {
        id: `kr-${Date.now()}`,
        asociatie_id: 'demo-asoc',
        user_id: DEMO_USER.id,
        bucket,
        count,
      };
      // Minors' privacy guard (T23): a registration is counts only, never a child's identity.
      assertAggregateOnly(record, KIDS_AGE_RANGE_FIELDS, 'kids_age_ranges');
      return { ranges: [...s.ranges, record] };
    }),
  removeRange: (bucket) =>
    set((s) => ({
      ranges: s.ranges.filter((r) => !(r.user_id === DEMO_USER.id && r.bucket === bucket)),
    })),
  addEvent: (title, date, time, location, bucket, note) =>
    set((s) => {
      const record: KidsEvent = {
        id: `ke-${Date.now()}`,
        asociatie_id: 'demo-asoc',
        title,
        date,
        time,
        location,
        bucket,
        note,
        interested: 0,
        organizer_user_id: DEMO_USER.id,
        organizer_name: DEMO_USER.name,
        created_at: new Date().toISOString(),
      };
      // Minors' privacy guard (T23): an activity carries the adult organizer + a target
      // age bucket, never an identified child.
      assertAggregateOnly(record, KIDS_EVENT_FIELDS, 'kids_events');
      return { events: [...s.events, record] };
    }),
  removeEvent: (id) =>
    set((s) => {
      const joinedIds = new Set(s.joinedIds);
      joinedIds.delete(id);
      return { events: s.events.filter((e) => e.id !== id), joinedIds };
    }),
  toggleJoin: (id) =>
    set((s) => {
      const joinedIds = new Set(s.joinedIds);
      if (joinedIds.has(id)) joinedIds.delete(id);
      else joinedIds.add(id);
      return { joinedIds };
    }),
}));
