import type { Announcement, AnnouncementAttachment } from '@/shared/types/domain';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { reportError } from '@/shared/lib/errorReporting';
import { genId } from '@/shared/lib/id';
import {
  type NewAnnouncementInput,
  announcementsForAsociatie,
  newAnnouncement,
} from './announcementsLogic';
import { useAnnouncementsStore } from './announcementsStore';

/* Dual-mode announcements repository (F01, T57 + T188). The zustand store is the
   synchronous source of truth the page reads; these functions apply each change
   there and, when a backend is configured, mirror it to `announcements` under
   RLS (members read; admin/presedinte/comitet write).

   Attachments (T188) live in the `attachments` table (related_type =
   'announcement') with the file bytes in the `attachments` Storage bucket. The
   path convention puts the asociatie_id first so the Storage RLS scopes access:
   `<asociatie_id>/announcements/<attachment_id>/<filename>`.

   The demo/offline store stays the default when Supabase is absent. */

const BUCKET = 'attachments';
const SIGNED_URL_EXPIRY_SECONDS = 3600;

function buildAttachmentPath(asociatieId: string, attachmentId: string, fileName: string): string {
  return `${asociatieId}/announcements/${attachmentId}/${fileName}`;
}

/** Hydrate the announcements (and their attachments) for one asociație from the
 *  backend, when configured. The demo store is the source of truth if the read
 *  fails or the backend is absent. */
export async function hydrateAnnouncements(asociatieId: string): Promise<void> {
  if (!isSupabaseConfigured || !asociatieId) return;
  const store = useAnnouncementsStore.getState();
  try {
    const { data, error } = await supabase
      .from('announcements')
      .select(
        'id, asociatie_id, author_user_id, title, body_html, category, audience, scheduled_at, published_at, expires_at, created_at, updated_at',
      )
      .eq('asociatie_id', asociatieId)
      .order('created_at', { ascending: false });
    if (error || !data) {
      reportError(error ?? new Error('no data'), { source: 'announcementsApi.hydrate' });
      store.setFetchError('load');
      return;
    }

    const byAnnouncement = await fetchAttachmentsByAnnouncement(asociatieId);
    const items = (data as Announcement[]).map((a) => ({
      ...a,
      attachments: byAnnouncement[a.id] ?? [],
    }));
    store.setFetchError(null);
    store.replaceForAsociatie(asociatieId, items);
  } catch (err) {
    reportError(err, { source: 'announcementsApi.hydrate' });
    store.setFetchError('load');
  }
}

/** Read the announcement attachments for one asociație, grouped by announcement
 *  id. Best-effort: returns an empty map on failure so hydration still renders. */
async function fetchAttachmentsByAnnouncement(
  asociatieId: string,
): Promise<Record<string, AnnouncementAttachment[]>> {
  try {
    const { data, error } = await supabase
      .from('attachments')
      .select('id, related_id, filename, mime_type, size_bytes, storage_path')
      .eq('asociatie_id', asociatieId)
      .eq('related_type', 'announcement');
    if (error || !data) return {};
    const grouped: Record<string, AnnouncementAttachment[]> = {};
    for (const row of data as Array<{
      id: string;
      related_id: string | null;
      filename: string | null;
      mime_type: string | null;
      size_bytes: number | null;
      storage_path: string | null;
    }>) {
      if (!row.related_id) continue;
      (grouped[row.related_id] ??= []).push({
        id: row.id,
        file_name: row.filename ?? '',
        file_size: row.size_bytes ?? 0,
        file_type: row.mime_type ?? '',
        storage_path: row.storage_path,
        file_data_url: null,
      });
    }
    return grouped;
  } catch {
    return {};
  }
}

/** Upload announcement attachment files to Storage (live path) and return their
 *  metadata with the Storage object path. Returns null if any upload fails,
 *  after removing the objects already uploaded so no orphans remain. */
export async function uploadAnnouncementAttachments(
  asociatieId: string,
  files: File[],
): Promise<AnnouncementAttachment[] | null> {
  const uploaded: AnnouncementAttachment[] = [];
  try {
    for (const file of files) {
      const id = genId();
      const path = buildAttachmentPath(asociatieId, id, file.name);
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) {
        await rollbackUploads(uploaded);
        return null;
      }
      uploaded.push({
        id,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        storage_path: path,
        file_data_url: null,
      });
    }
    return uploaded;
  } catch {
    await rollbackUploads(uploaded);
    return null;
  }
}

async function rollbackUploads(uploaded: AnnouncementAttachment[]): Promise<void> {
  const paths = uploaded.map((a) => a.storage_path).filter((p): p is string => !!p);
  if (paths.length) {
    try {
      await supabase.storage.from(BUCKET).remove(paths);
    } catch {
      /* best-effort */
    }
  }
}

/** Publish (or schedule) an announcement: updates the store synchronously and
 *  mirrors the row + attachment rows to the backend when configured. */
export function publishAnnouncement(
  asociatieId: string,
  authorUserId: string,
  input: NewAnnouncementInput,
): void {
  const item = newAnnouncement(input, asociatieId, authorUserId);
  const state = useAnnouncementsStore.getState();
  const current = announcementsForAsociatie(state.byAsociatie, asociatieId);
  state.replaceForAsociatie(asociatieId, [item, ...current]);
  if (isSupabaseConfigured) {
    void (async () => {
      try {
        await supabase.from('announcements').insert({
          id: item.id,
          asociatie_id: item.asociatie_id,
          author_user_id: item.author_user_id,
          title: item.title,
          body_html: item.body_html,
          category: item.category,
          audience: item.audience,
          scheduled_at: item.scheduled_at,
          published_at: item.published_at,
          created_at: item.created_at,
          updated_at: item.updated_at,
        });
        const attachments = item.attachments ?? [];
        if (attachments.length) {
          await supabase.from('attachments').insert(
            attachments.map((att) => ({
              id: att.id,
              asociatie_id: item.asociatie_id,
              related_type: 'announcement',
              related_id: item.id,
              filename: att.file_name,
              mime_type: att.file_type,
              size_bytes: att.file_size,
              storage_path: att.storage_path,
              uploaded_by: authorUserId,
            })),
          );
        }
      } catch (err) {
        reportError(err, { source: 'announcementsApi.publish' });
      }
    })();
  }
}

/** Delete announcements by id; updates the store synchronously and mirrors to the backend. */
export function deleteAnnouncements(asociatieId: string, ids: string[]): void {
  if (!ids.length) return;
  useAnnouncementsStore.getState().remove(asociatieId, ids);
  if (isSupabaseConfigured) {
    void (async () => {
      try {
        await supabase.from('announcements').delete().in('id', ids);
      } catch (err) {
        reportError(err, { source: 'announcementsApi.delete' });
      }
    })();
  }
}

/** Return a short-lived signed URL for an announcement attachment, or null. */
export async function getAttachmentSignedUrl(storagePath: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_EXPIRY_SECONDS);
    if (error || !data) return null;
    return data.signedUrl;
  } catch {
    return null;
  }
}
