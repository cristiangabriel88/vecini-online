import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Announcement } from '@/shared/types/domain';
import { useAuthStore } from '@/shared/store/authStore';
import {
  type AnnouncementsByAsociatie,
  type NewAnnouncementInput,
  addAnnouncementIn,
  announcementsForAsociatie,
  migrateAnnouncementsState,
  newAnnouncement,
  seedAnnouncements,
} from './announcementsLogic';

interface AnnouncementsState {
  /** Announcements per asociație, keyed by asociație id. */
  byAsociatie: AnnouncementsByAsociatie;
  /** Read receipts keyed by (globally unique) announcement id. */
  reads: Record<string, boolean>;
  /** Non-null when the last live fetch failed; null in demo/offline mode or after a successful fetch. */
  fetchError: string | null;
  /** Publish an announcement into one asociație, authored by the given user. */
  add: (asociatieId: string, authorUserId: string, input: NewAnnouncementInput) => void;
  /** Replace the full list for one asociație (used by live hydration). */
  replaceForAsociatie: (asociatieId: string, items: Announcement[]) => void;
  /** Set or clear the live-fetch error (called by the API layer). */
  setFetchError: (msg: string | null) => void;
  markRead: (id: string) => void;
  /** The announcements for one asociație (stable reference). */
  forAsociatie: (asociatieId: string | null) => Announcement[];
}

/**
 * Announcements scoped per asociație (T47): the demo asociație is seeded so the
 * offline app is populated, and an admin publish lands only in the active
 * asociație's list. Persisted so published announcements survive reload (T65);
 * version bumps reseed the demo asociație so stale demo content is refreshed.
 * Live read/write against `announcements` under RLS is T57.
 */
export const useAnnouncementsStore = create<AnnouncementsState>()(
  persist(
    (set, get) => ({
      byAsociatie: seedAnnouncements(),
      reads: {},
      fetchError: null,
      add: (asociatieId, authorUserId, input) =>
        set((s) => ({
          byAsociatie: addAnnouncementIn(
            s.byAsociatie,
            asociatieId,
            newAnnouncement(input, asociatieId, authorUserId),
          ),
        })),
      replaceForAsociatie: (asociatieId, items) =>
        set((s) => ({ byAsociatie: { ...s.byAsociatie, [asociatieId]: items } })),
      setFetchError: (msg) => set({ fetchError: msg }),
      markRead: (id) => set((s) => ({ reads: { ...s.reads, [id]: true } })),
      forAsociatie: (asociatieId) => announcementsForAsociatie(get().byAsociatie, asociatieId),
    }),
    {
      name: 'vecini.announcements',
      version: 1,
      partialize: (s) => ({ byAsociatie: s.byAsociatie, reads: s.reads }),
      migrate: (persisted) => ({
        byAsociatie: migrateAnnouncementsState(persisted),
        reads: (persisted as { reads?: Record<string, boolean> } | null)?.reads ?? {},
      }),
    },
  ),
);

/** Hook: the announcements for the currently active asociație. */
export function useAsociatieAnnouncements(): Announcement[] {
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  return useAnnouncementsStore((s) => announcementsForAsociatie(s.byAsociatie, asociatieId));
}
