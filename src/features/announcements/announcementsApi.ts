import type { Announcement, AnnouncementAttachment, AnnouncementCategory } from '@/shared/types/domain';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { reportError } from '@/shared/lib/errorReporting';
import { genId } from '@/shared/lib/id';
import {
  type NewAnnouncementInput,
  announcementsForAsociatie,
  newAnnouncement,
} from './announcementsLogic';
import { useAnnouncementsStore } from './announcementsStore';
import { downscalePhoto } from '@/shared/lib/imageResize';

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
/** Newest announcements fetched per hydrate; older rows stay on the server. */
const HYDRATE_LIMIT = 200;

function buildAttachmentPath(asociatieId: string, attachmentId: string, fileName: string): string {
  return `${asociatieId}/announcements/${attachmentId}/${fileName}`;
}

/** Hydrate the announcements (and their attachments) for one asociație from the
 *  backend, when configured. Returns whether there may be older rows beyond the
 *  HYDRATE_LIMIT cap. The demo store is the source of truth if the read fails or
 *  the backend is absent. */
export async function hydrateAnnouncements(asociatieId: string): Promise<{ hasMore: boolean }> {
  if (!isSupabaseConfigured || !asociatieId) return { hasMore: false };
  const store = useAnnouncementsStore.getState();
  try {
    const { data, error } = await supabase
      .from('announcements')
      .select(
        'id, asociatie_id, author_user_id, title, body_html, category, audience, scheduled_at, published_at, expires_at, created_at, updated_at',
      )
      .eq('asociatie_id', asociatieId)
      .order('created_at', { ascending: false })
      .limit(HYDRATE_LIMIT);
    if (error || !data) {
      reportError(error ?? new Error('no data'), { source: 'announcementsApi.hydrate' });
      store.setFetchError('load');
      return { hasMore: false };
    }

    const ids = (data as Announcement[]).map((a) => a.id);
    const byAnnouncement = await fetchAttachmentsByAnnouncement(asociatieId, ids);
    const items = (data as Announcement[]).map((a) => ({
      ...a,
      attachments: byAnnouncement[a.id] ?? [],
    }));
    store.setFetchError(null);
    store.replaceForAsociatie(asociatieId, items);
    return { hasMore: data.length === HYDRATE_LIMIT };
  } catch (err) {
    reportError(err, { source: 'announcementsApi.hydrate' });
    store.setFetchError('load');
    return { hasMore: false };
  }
}

/** Fetch announcements older than `oldestCreatedAt` and append them to the
 *  store. Returns whether there may be even older rows. No-op when offline. */
export async function loadOlderAnnouncements(
  asociatieId: string,
  oldestCreatedAt: string,
): Promise<{ hasMore: boolean }> {
  if (!isSupabaseConfigured || !asociatieId) return { hasMore: false };
  const store = useAnnouncementsStore.getState();
  try {
    const { data, error } = await supabase
      .from('announcements')
      .select(
        'id, asociatie_id, author_user_id, title, body_html, category, audience, scheduled_at, published_at, expires_at, created_at, updated_at',
      )
      .eq('asociatie_id', asociatieId)
      .lt('created_at', oldestCreatedAt)
      .order('created_at', { ascending: false })
      .limit(HYDRATE_LIMIT);
    if (error || !data || !data.length) {
      if (error) reportError(error, { source: 'announcementsApi.loadOlder' });
      return { hasMore: false };
    }
    const ids = (data as Announcement[]).map((a) => a.id);
    const byAnnouncement = await fetchAttachmentsByAnnouncement(asociatieId, ids);
    const items = (data as Announcement[]).map((a) => ({
      ...a,
      attachments: byAnnouncement[a.id] ?? [],
    }));
    store.appendForAsociatie(asociatieId, items);
    return { hasMore: data.length === HYDRATE_LIMIT };
  } catch (err) {
    reportError(err, { source: 'announcementsApi.loadOlder' });
    return { hasMore: false };
  }
}

/** Read announcement attachments grouped by announcement id.
 *  When `announcementIds` is provided only those announcements are fetched
 *  (used by load-older pagination to avoid re-fetching the full set).
 *  Best-effort: returns an empty map on failure so hydration still renders. */
async function fetchAttachmentsByAnnouncement(
  asociatieId: string,
  announcementIds?: string[],
): Promise<Record<string, AnnouncementAttachment[]>> {
  try {
    let q = supabase
      .from('attachments')
      .select('id, related_id, filename, mime_type, size_bytes, storage_path')
      .eq('asociatie_id', asociatieId)
      .eq('related_type', 'announcement');
    if (announcementIds?.length) q = q.in('related_id', announcementIds);
    const { data, error } = await q;
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
      const uploadFile = await downscalePhoto(file);
      const id = genId();
      const path = buildAttachmentPath(asociatieId, id, uploadFile.name);
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, uploadFile, { contentType: uploadFile.type, upsert: false });
      if (error) {
        await rollbackUploads(uploaded);
        return null;
      }
      uploaded.push({
        id,
        file_name: uploadFile.name,
        file_size: uploadFile.size,
        file_type: uploadFile.type,
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
 *  mirrors the row + attachment rows to the backend when configured.
 *  Throws if the backend write fails so callers can surface the error. */
export async function publishAnnouncement(
  asociatieId: string,
  authorUserId: string,
  input: NewAnnouncementInput,
): Promise<void> {
  const item = newAnnouncement(input, asociatieId, authorUserId);
  const state = useAnnouncementsStore.getState();
  const current = announcementsForAsociatie(state.byAsociatie, asociatieId);
  state.replaceForAsociatie(asociatieId, [item, ...current]);
  if (!isSupabaseConfigured) return;
  const { error: rowError } = await supabase.from('announcements').insert({
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
  if (rowError) throw rowError;
  const attachments = item.attachments ?? [];
  if (attachments.length) {
    const { error: attError } = await supabase.from('attachments').insert(
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
    if (attError) throw attError;
  }
}

/** Delete announcements by id; updates the store synchronously and mirrors to
 *  the backend. supabase-js returns { error } instead of throwing on an
 *  RLS/PostgREST failure, so the result is checked and the pre-delete snapshot
 *  restored when the backend rejected the delete (otherwise the rows would
 *  reappear on the next hydrate with no explanation). */
export function deleteAnnouncements(asociatieId: string, ids: string[], onError?: () => void): void {
  if (!ids.length) return;
  const store = useAnnouncementsStore.getState();
  const before = announcementsForAsociatie(store.byAsociatie, asociatieId);
  store.remove(asociatieId, ids);
  if (isSupabaseConfigured) {
    void (async () => {
      try {
        const { error } = await supabase.from('announcements').delete().in('id', ids);
        if (error) throw error;
      } catch (err) {
        useAnnouncementsStore.getState().replaceForAsociatie(asociatieId, before);
        reportError(err, { source: 'announcementsApi.delete' });
        onError?.();
      }
    })();
  }
}

/** Update mutable fields of one announcement; updates the store and mirrors to the backend. */
/** Update an announcement's fields; updates the store synchronously and mirrors to the backend.
 *  Throws if the backend write fails so callers can surface the error. */
export async function updateAnnouncement(
  asociatieId: string,
  id: string,
  patch: { title?: string; body_html?: string; category?: AnnouncementCategory },
): Promise<void> {
  useAnnouncementsStore.getState().update(asociatieId, id, patch);
  if (!isSupabaseConfigured) return;
  const { error } = await supabase
    .from('announcements')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
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
