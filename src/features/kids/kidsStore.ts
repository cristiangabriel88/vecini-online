import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { KidsAgeBucket, KidsAgeRange, KidsEvent } from '@/shared/types/domain';
import { useAuthStore } from '@/shared/store/authStore';
import {
  KIDS_AGE_RANGE_FIELDS,
  KIDS_EVENT_FIELDS,
  assertAggregateOnly,
} from '@/shared/lib/minorsGuard';
import {
  type KidsByAsociatie,
  type KidsCatalog,
  seedKids,
  kidsForAsociatie,
  upsertRangeIn,
  removeRangeIn,
  addEventIn,
  removeEventIn,
  migrateKidsState,
} from './kidsLogic';

/** Demo identity of the signed-in resident (a parent). */
export const DEMO_USER = { id: 'u-res', name: 'Popescu Andrei' };

interface KidsState {
  byAsociatie: KidsByAsociatie;
  joinedIds: string[];
  fetchError: string | null;
  registerKids: (asociatieId: string, userId: string, userName: string, bucket: KidsAgeBucket, count: number) => void;
  removeRange: (asociatieId: string, userId: string, bucket: KidsAgeBucket) => void;
  addEvent: (asociatieId: string, event: KidsEvent) => void;
  removeEvent: (asociatieId: string, eventId: string) => void;
  toggleJoin: (eventId: string) => void;
  replaceForAsociatie: (asociatieId: string, catalog: KidsCatalog) => void;
  setFetchError: (msg: string | null) => void;
}

export const useKidsStore = create<KidsState>()(
  persist(
    (set, _get) => ({
      byAsociatie: seedKids(),
      joinedIds: [],
      fetchError: null,

      registerKids: (asociatieId, userId, _userName, bucket, count) => {
        const record: KidsAgeRange = {
          id: `kr-${Date.now()}`,
          asociatie_id: asociatieId,
          user_id: userId,
          bucket,
          count,
        };
        assertAggregateOnly(record, KIDS_AGE_RANGE_FIELDS, 'kids_age_ranges');
        set((s) => ({ byAsociatie: upsertRangeIn(s.byAsociatie, asociatieId, record) }));
      },

      removeRange: (asociatieId, userId, bucket) =>
        set((s) => ({ byAsociatie: removeRangeIn(s.byAsociatie, asociatieId, userId, bucket) })),

      addEvent: (asociatieId, event) => {
        assertAggregateOnly(event, KIDS_EVENT_FIELDS, 'kids_events');
        set((s) => ({ byAsociatie: addEventIn(s.byAsociatie, asociatieId, event) }));
      },

      removeEvent: (asociatieId, eventId) =>
        set((s) => ({
          byAsociatie: removeEventIn(s.byAsociatie, asociatieId, eventId),
          joinedIds: s.joinedIds.filter((id) => id !== eventId),
        })),

      toggleJoin: (eventId) =>
        set((s) => ({
          joinedIds: s.joinedIds.includes(eventId)
            ? s.joinedIds.filter((id) => id !== eventId)
            : [...s.joinedIds, eventId],
        })),

      replaceForAsociatie: (asociatieId, catalog) =>
        set((s) => ({ byAsociatie: { ...s.byAsociatie, [asociatieId]: catalog } })),

      setFetchError: (msg) => set({ fetchError: msg }),
    }),
    {
      name: 'vecini.kids',
      version: 1,
      partialize: (s) => ({ byAsociatie: s.byAsociatie, joinedIds: s.joinedIds }),
      migrate: (persisted) => {
        const p = persisted as { byAsociatie?: KidsByAsociatie; joinedIds?: string[] } | null;
        return {
          byAsociatie: migrateKidsState(persisted),
          joinedIds: p?.joinedIds ?? [],
        };
      },
    },
  ),
);

export function useAsociatieKids(): KidsCatalog {
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  return useKidsStore((s) => kidsForAsociatie(s.byAsociatie, asociatieId));
}
