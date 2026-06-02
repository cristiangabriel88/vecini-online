import type { PvDocument } from '@/shared/types/domain';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { reportError } from '@/shared/lib/errorReporting';
import { type NewPvInput, newPvDocument, pvForAsociatie } from './pvLogic';
import { usePvStore } from './pvStore';

/* Dual-mode PV-documents repository (F11, T191). The zustand store is the
   synchronous source of truth the page reads; these functions apply each change
   there and, when a backend is configured, mirror it to `pv_documents` under
   RLS (members read; admin/presedinte/comitet write).

   Uploaded files live in the `attachments` Storage bucket under the path
   `<asociatie_id>/pv/<doc_id>/<filename>`, consistent with the announcements
   attachment path convention. The demo/offline store stays the default when
   Supabase is absent. */

const BUCKET = 'attachments';
const SIGNED_URL_EXPIRY_SECONDS = 3600;

function buildPvPath(asociatieId: string, docId: string, fileName: string): string {
  return `${asociatieId}/pv/${docId}/${fileName}`;
}

/** Hydrate the PV documents for one asociație from the backend, when
 *  configured. The demo store is the source of truth if the read fails or
 *  the backend is absent. */
export async function hydratePvDocuments(asociatieId: string): Promise<void> {
  if (!isSupabaseConfigured || !asociatieId) return;
  const store = usePvStore.getState();
  try {
    const { data, error } = await supabase
      .from('pv_documents')
      .select('id, asociatie_id, title, doc_date, category, content_text, storage_path, created_at')
      .eq('asociatie_id', asociatieId)
      .order('doc_date', { ascending: false });
    if (error || !data) {
      reportError(error ?? new Error('no data'), { source: 'pvApi.hydrate' });
      store.setFetchError('load');
      return;
    }
    store.setFetchError(null);
    store.replaceForAsociatie(
      asociatieId,
      (data as Array<Omit<PvDocument, 'category'> & { category: string | null }>).map((r) => ({
        ...r,
        category: r.category ?? 'Altele',
      })),
    );
  } catch (err) {
    reportError(err, { source: 'pvApi.hydrate' });
    store.setFetchError('load');
  }
}

/** Add a PV document: updates the store synchronously and mirrors to the
 *  `pv_documents` table (and optionally uploads a file to Storage) when a
 *  backend is configured. Returns the created document immediately. */
export function addPvDocument(
  asociatieId: string,
  input: NewPvInput,
  file?: File,
): PvDocument {
  const doc = newPvDocument(input, asociatieId);
  const store = usePvStore.getState();
  const current = pvForAsociatie(store.byAsociatie, asociatieId);
  store.replaceForAsociatie(asociatieId, [doc, ...current]);

  if (isSupabaseConfigured) {
    void (async () => {
      try {
        let storagePath: string | null = null;
        if (file) {
          const path = buildPvPath(asociatieId, doc.id, file.name);
          const { error: uploadError } = await supabase.storage
            .from(BUCKET)
            .upload(path, file, { contentType: file.type, upsert: false });
          if (!uploadError) storagePath = path;
          else reportError(uploadError, { source: 'pvApi.upload' });
        }
        await supabase.from('pv_documents').insert({
          id: doc.id,
          asociatie_id: doc.asociatie_id,
          title: doc.title,
          doc_date: doc.doc_date,
          category: doc.category,
          content_text: doc.content_text,
          storage_path: storagePath,
          created_at: doc.created_at,
        });
        if (storagePath) {
          const s = usePvStore.getState();
          const updated = pvForAsociatie(s.byAsociatie, asociatieId).map((d) =>
            d.id === doc.id ? { ...d, storage_path: storagePath } : d,
          );
          s.replaceForAsociatie(asociatieId, updated);
        }
      } catch (err) {
        reportError(err, { source: 'pvApi.add' });
      }
    })();
  }
  return doc;
}

/** Return a short-lived signed URL for a PV document's Storage file, or null
 *  when offline or if the call fails. */
export async function getPvSignedUrl(storagePath: string): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
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
