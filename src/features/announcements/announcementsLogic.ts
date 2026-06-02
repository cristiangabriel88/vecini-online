import type {
  Announcement,
  AnnouncementAttachment,
  AnnouncementCategory,
} from '@/shared/types/domain';
import { type FileValidationError, validateFile } from '@/shared/lib/file';
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

/** True when the active role may compose/schedule announcements (F01). */
export function canManageAnnouncements(role: string | null): boolean {
  return role === 'admin' || role === 'presedinte' || role === 'comitet';
}

/* ── Attachments (F01) ─────────────────────────────────────────────────────
   The spec allows PDF + image attachments. Stored as base64 data URLs offline
   and as Supabase Storage object paths in the live path (T188). */

/** Maximum attachment size accepted (10 MB). */
export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;

/** MIME types accepted for announcement attachments (PDF + images). */
export const ATTACHMENT_ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
] as const;

/** accept="" value for <input type="file"> matching ATTACHMENT_ALLOWED_TYPES. */
export const ATTACHMENT_ACCEPT = '.pdf,.jpg,.jpeg,.png,.gif,.webp';

export type AttachmentFileError = FileValidationError;

/** Validate a candidate attachment; returns null when the file is acceptable. */
export function validateAttachmentFile(file: {
  size: number;
  type: string;
}): AttachmentFileError | null {
  return validateFile(file, ATTACHMENT_MAX_BYTES, ATTACHMENT_ALLOWED_TYPES);
}

/** The fields a publisher supplies; the rest of the row is derived. */
export interface NewAnnouncementInput {
  title: string;
  body_html: string;
  category: AnnouncementCategory;
  /** ISO timestamp to hold the announcement back until; published immediately
   *  when null/undefined or not in the future. */
  scheduled_at?: string | null;
  /** Optional file attachments. */
  attachments?: AnnouncementAttachment[];
}

/**
 * Build an announcement owned by `asociatieId` and authored by the publishing
 * user, addressed to the whole asociație (the targeted broadcast in F01's spec
 * is a later refinement). When `scheduled_at` is a future timestamp the row is
 * held back: `published_at` stays null until due. Otherwise it publishes now.
 */
export function newAnnouncement(
  input: NewAnnouncementInput,
  asociatieId: string,
  authorUserId: string,
  now: Date = new Date(),
): Announcement {
  const iso = now.toISOString();
  const scheduledMs = input.scheduled_at ? new Date(input.scheduled_at).getTime() : NaN;
  const isFutureSchedule = Number.isFinite(scheduledMs) && scheduledMs > now.getTime();
  return {
    id: `an-${now.getTime()}`,
    asociatie_id: asociatieId,
    author_user_id: authorUserId,
    title: input.title,
    body_html: input.body_html,
    category: input.category,
    audience: { type: 'all' },
    scheduled_at: isFutureSchedule ? input.scheduled_at! : null,
    published_at: isFutureSchedule ? null : iso,
    expires_at: null,
    attachments: input.attachments ?? [],
    created_at: iso,
    updated_at: iso,
  };
}

/**
 * True when an announcement is live to residents at `now`: either already
 * published, or scheduled for a time that has arrived.
 */
export function isAnnouncementDue(a: Announcement, now: Date = new Date()): boolean {
  if (a.published_at) return true;
  if (a.scheduled_at) return new Date(a.scheduled_at).getTime() <= now.getTime();
  return false;
}

/** True when an announcement is scheduled for the future and not yet due. */
export function isScheduledPending(a: Announcement, now: Date = new Date()): boolean {
  return !a.published_at && !!a.scheduled_at && new Date(a.scheduled_at).getTime() > now.getTime();
}

/** Announcements a resident may see at `now` (only those that are due). */
export function visibleAnnouncements(list: Announcement[], now: Date = new Date()): Announcement[] {
  return list.filter((a) => isAnnouncementDue(a, now));
}

/**
 * Migrate persisted state from any earlier version to the current shape.
 * Preserves non-demo asociații so a locally-created asociație keeps its
 * published announcements, but always reseeds the demo asociație from
 * `DEMO_ANNOUNCEMENTS` so stale demo content is refreshed on version bump.
 */
export function migrateAnnouncementsState(persisted: unknown): AnnouncementsByAsociatie {
  const state = persisted as { byAsociatie?: unknown } | null;
  const old = state?.byAsociatie;
  if (old && typeof old === 'object') {
    return { ...(old as AnnouncementsByAsociatie), [DEMO_ASOCIATIE.id]: [...DEMO_ANNOUNCEMENTS] };
  }
  return seedAnnouncements();
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
