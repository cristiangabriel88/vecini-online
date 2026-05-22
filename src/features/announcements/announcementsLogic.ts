import type { Announcement, AnnouncementCategory } from '@/shared/types/domain';
import { DEMO_ANNOUNCEMENTS, DEMO_ASOCIATIE } from '@/shared/demo/demoData';

/**
 * Announcements (F01) scoped per asociație (T47).
 *
 * Pure model so the demo store stays the offline source of truth and the loop
 * (admin publishes, resident reads) works fully offline. Each asociație owns its
 * own list, keyed by asociație id, so a published announcement and the reads
 * that follow belong to the active tenant and never leak across asociații. With
 * a real backend the list is hydrated from / written back to `announcements`
 * under RLS (live activation is T57); this module stays the single source of the
 * shape and the per-asociație partitioning.
 */

/** All asociații's announcements, keyed by asociație id. */
export type AnnouncementsByAsociatie = Record<string, Announcement[]>;

/**
 * Stable empty list returned for an unknown or null asociație so React selectors
 * keep a constant reference (a fresh `[]` per call would force needless
 * re-renders). Never mutate it; the helpers always build a new array.
 */
const EMPTY_ANNOUNCEMENTS = Object.freeze([] as Announcement[]) as Announcement[];

/**
 * Seed used the first time the store initialises (before any persisted state):
 * the demo asociație gets the seeded announcements so the offline app is
 * populated. Other asociații start empty until an admin publishes.
 */
export function seedAnnouncements(): AnnouncementsByAsociatie {
  return { [DEMO_ASOCIATIE.id]: [...DEMO_ANNOUNCEMENTS] };
}

/**
 * The announcements for one asociație. Returns the stored list (a stable
 * reference) or a shared frozen empty list when the asociație has none yet or
 * none is active.
 */
export function announcementsForAsociatie(
  byAsociatie: AnnouncementsByAsociatie,
  asociatieId: string | null,
): Announcement[] {
  if (!asociatieId) return EMPTY_ANNOUNCEMENTS;
  return byAsociatie[asociatieId] ?? EMPTY_ANNOUNCEMENTS;
}

/** The fields a publisher supplies; the rest of the row is derived. */
export interface NewAnnouncementInput {
  title: string;
  body_html: string;
  category: AnnouncementCategory;
}

/**
 * Build a published announcement owned by `asociatieId` and authored by the
 * publishing user. Published immediately to the whole asociație (the targeted
 * broadcast in F01's spec is a later refinement).
 */
export function newAnnouncement(
  input: NewAnnouncementInput,
  asociatieId: string,
  authorUserId: string,
  now: Date = new Date(),
): Announcement {
  const iso = now.toISOString();
  return {
    id: `an-${now.getTime()}`,
    asociatie_id: asociatieId,
    author_user_id: authorUserId,
    title: input.title,
    body_html: input.body_html,
    category: input.category,
    audience: { type: 'all' },
    scheduled_at: null,
    published_at: iso,
    expires_at: null,
    created_at: iso,
    updated_at: iso,
  };
}

/**
 * Prepend an announcement to one asociație's list (newest first), returning a
 * new `byAsociatie` map without mutating the input.
 */
export function addAnnouncementIn(
  byAsociatie: AnnouncementsByAsociatie,
  asociatieId: string,
  announcement: Announcement,
): AnnouncementsByAsociatie {
  return {
    ...byAsociatie,
    [asociatieId]: [announcement, ...(byAsociatie[asociatieId] ?? [])],
  };
}
