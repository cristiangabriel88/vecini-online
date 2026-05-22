import { create } from 'zustand';
import type { KidsAgeBucket, KidsAgeRange, KidsEvent } from '@/shared/types/domain';
import { DEMO_KIDS_RANGES, DEMO_KIDS_EVENTS } from '@/shared/demo/demoData';

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
        return {
          ranges: s.ranges.map((r) => (r.id === existing.id ? { ...r, count } : r)),
        };
      }
      return {
        ranges: [
          ...s.ranges,
          {
            id: `kr-${Date.now()}`,
            asociatie_id: 'demo-asoc',
            user_id: DEMO_USER.id,
            bucket,
            count,
          },
        ],
      };
    }),
  removeRange: (bucket) =>
    set((s) => ({
      ranges: s.ranges.filter((r) => !(r.user_id === DEMO_USER.id && r.bucket === bucket)),
    })),
  addEvent: (title, date, time, location, bucket, note) =>
    set((s) => ({
      events: [
        ...s.events,
        {
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
        },
      ],
    })),
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
