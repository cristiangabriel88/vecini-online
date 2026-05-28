import { create } from 'zustand';
import type { Announcement } from '@/shared/types/domain';
import { useAuthStore } from '@/shared/store/authStore';
import {
  type AnnouncementsByAsociatie,
  type NewAnnouncementInput,
  addAnnouncementIn,
  announcementsForAsociatie,
  newAnnouncement,
  seedAnnouncements,
} from './announcementsLogic';

interface AnnouncementsState {
  /** Announcements per asociație, keyed by asociație id. */
  byAsociatie: AnnouncementsByAsociatie;
  /** Read receipts keyed by (globally unique) announcement id. */
  reads: Record<string, boolean>;
  /** Publish an announcement into one asociație, authored by the given user. */
  add: (asociatieId: string, authorUserId: string, input: NewAnnouncementInput) => void;
  /** Replace the full list for one asociație (used by live hydration). */
  replaceForAsociatie: (asociatieId: string, items: Announcement[]) => void;
  markRead: (id: string) => void;
  /** The announcements for one asociație (stable reference). */
  forAsociatie: (asociatieId: string | null) => Announcement[];
}

/**
 * Announcements scoped per asociație (T47): the demo asociație is seeded so the
 * offline app is populated, and an admin publish lands only in the active
 * asociație's list. The demo store is the offline source of truth; live
 * read/write against `announcements` under RLS is T57.
 */
export const useAnnouncementsStore = create<AnnouncementsState>((set, get) => ({
  byAsociatie: seedAnnouncements(),
  reads: {},
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
  markRead: (id) => set((s) => ({ reads: { ...s.reads, [id]: true } })),
  forAsociatie: (asociatieId) => announcementsForAsociatie(get().byAsociatie, asociatieId),
}));

/** Hook: the announcements for the currently active asociație. */
export function useAsociatieAnnouncements(): Announcement[] {
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  return useAnnouncementsStore((s) => announcementsForAsociatie(s.byAsociatie, asociatieId));
}
