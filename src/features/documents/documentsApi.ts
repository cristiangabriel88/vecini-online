import type { DocumentRecord } from '@/shared/types/domain';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { useDocumentsStore } from './documentsStore';

/* Dual-mode documents repository (F33, T89). The zustand store is the
   synchronous source of truth the page reads; these functions apply each change
   there and, when Supabase Storage is configured, mirror it to the `documents`
   bucket + DB table under RLS (members read; admin/presedinte/comitet write).

   Storage path convention: `<asociatie_id>/<doc_id>/<filename>`
   The `documents` bucket and its RLS policies are created by
   supabase/migrations/20260121000003_storage.sql.

   Building-level documents (statut, regulament, contracte) are asociatie-scoped,
   not personal data tied to a specific resident. They are therefore excluded from
   resident-level GDPR erasure requests. Storage objects are cleaned up when the
   document record itself is deleted via removeDocumentLive (consistent with the
   general principle that deleting the row also removes the file). */

const BUCKET = 'documents';
const SIGNED_URL_EXPIRY_SECONDS = 3600;

function buildStoragePath(asociatieId: string, docId: string, fileName: string): string {
  return `${asociatieId}/${docId}/${fileName}`;
}

/** Hydrate the documents for one asociație from the DB, when Supabase is configured.
 *  Falls back silently; the local store remains the source of truth if the read fails. */
export async function hydrateDocuments(asociatieId: string): Promise<void> {
  if (!isSupabaseConfigured || !asociatieId) return;
  try {
    const { data, error } = await supabase
      .from('documents')
      .select(
        'id, asociatie_id, category, title, storage_path, file_name, file_size, file_type, version, content_text, created_at',
      )
      .eq('asociatie_id', asociatieId)
      .order('created_at', { ascending: false });
    if (error || !data) return;
    const records = (data as DocumentRecord[]).map((d) => ({ ...d, file_data_url: null }));
    useDocumentsStore.getState().replaceForAsociatie(asociatieId, records);
  } catch {
    /* best-effort */
  }
}

/** Upload a file to Supabase Storage and insert a `documents` row.
 *  Returns the new record on success, or null if either step fails.
 *  On DB insert failure the uploaded object is removed to avoid orphans. */
export async function addDocumentLive(
  asociatieId: string,
  docId: string,
  title: string,
  category: string,
  contentText: string,
  file: File,
): Promise<DocumentRecord | null> {
  const path = buildStoragePath(asociatieId, docId, file.name);
  try {
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) return null;

    const record: DocumentRecord = {
      id: docId,
      asociatie_id: asociatieId,
      category,
      title: title.trim(),
      storage_path: path,
      file_name: file.name,
      file_size: file.size,
      file_type: file.type,
      file_data_url: null,
      version: 1,
      content_text: contentText.trim() || null,
      created_at: new Date().toISOString(),
    };

    const { error: dbError } = await supabase.from('documents').insert({
      id: record.id,
      asociatie_id: record.asociatie_id,
      category: record.category,
      title: record.title,
      storage_path: record.storage_path,
      file_name: record.file_name,
      file_size: record.file_size,
      file_type: record.file_type,
      version: record.version,
      content_text: record.content_text,
      created_at: record.created_at,
    });

    if (dbError) {
      await supabase.storage.from(BUCKET).remove([path]);
      return null;
    }

    return record;
  } catch {
    return null;
  }
}

/** Insert a metadata-only document row (no file) to Supabase. */
export async function addDocumentMetadataLive(
  asociatieId: string,
  docId: string,
  title: string,
  category: string,
  contentText: string,
): Promise<boolean> {
  try {
    const { error } = await supabase.from('documents').insert({
      id: docId,
      asociatie_id: asociatieId,
      category,
      title: title.trim(),
      storage_path: null,
      version: 1,
      content_text: contentText.trim() || null,
      created_at: new Date().toISOString(),
    });
    return !error;
  } catch {
    return false;
  }
}

/** Delete the Storage object (if any) and the `documents` DB row. */
export async function removeDocumentLive(docId: string, storagePth: string | null): Promise<void> {
  try {
    if (storagePth) {
      await supabase.storage.from(BUCKET).remove([storagePth]);
    }
    await supabase.from('documents').delete().eq('id', docId);
  } catch {
    /* best-effort */
  }
}

/** Return a short-lived signed URL for a document file, or null on failure. */
export async function getDocumentSignedUrl(storagePth: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(storagePth, SIGNED_URL_EXPIRY_SECONDS);
    if (error || !data) return null;
    return data.signedUrl;
  } catch {
    return null;
  }
}
