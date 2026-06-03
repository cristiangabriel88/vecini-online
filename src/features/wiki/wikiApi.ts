import type { WikiPage } from '@/shared/types/domain';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { reportError } from '@/shared/lib/errorReporting';
import { useWikiStore } from './wikiStore';

interface WikiPageRow {
  id: string;
  asociatie_id: string;
  slug: string | null;
  title: string | null;
  body_md: string | null;
  updated_at: string;
}

function rowToPage(row: WikiPageRow): WikiPage {
  return {
    id: row.id,
    asociatie_id: row.asociatie_id,
    slug: row.slug ?? '',
    title: row.title ?? '',
    body_md: row.body_md ?? '',
    updated_at: row.updated_at,
  };
}

/**
 * Hydrate one asociatie's wiki pages from the backend. Reads `wiki_pages`
 * ordered alphabetically by title. No-op when the backend is absent or id is
 * empty.
 */
export async function hydrateWiki(asociatieId: string): Promise<void> {
  if (!isSupabaseConfigured || !asociatieId) return;
  const store = useWikiStore.getState();
  try {
    const { data, error } = await supabase
      .from('wiki_pages')
      .select('id, asociatie_id, slug, title, body_md, updated_at')
      .eq('asociatie_id', asociatieId)
      .order('title');
    if (error || !data) {
      reportError(error ?? new Error('no data'), { source: 'wikiApi.hydrate' });
      store.setFetchError('load');
      return;
    }
    store.setFetchError(null);
    store.replaceForAsociatie(asociatieId, (data as WikiPageRow[]).map(rowToPage));
  } catch (err) {
    reportError(err, { source: 'wikiApi.hydrate' });
    store.setFetchError('load');
  }
}

/**
 * Add a wiki page: apply to the store synchronously then mirror an insert
 * to `wiki_pages` behind `isSupabaseConfigured`.
 */
export function addWikiPageLive(asociatieId: string, page: WikiPage): void {
  useWikiStore.getState().addPage(asociatieId, page);
  if (!isSupabaseConfigured) return;
  void (async () => {
    try {
      await supabase.from('wiki_pages').insert({
        id: page.id,
        asociatie_id: asociatieId,
        slug: page.slug,
        title: page.title,
        body_md: page.body_md,
      });
    } catch (err) {
      reportError(err, { source: 'wikiApi.add' });
    }
  })();
}

/**
 * Update a wiki page: apply to the store synchronously then mirror an update
 * to `wiki_pages` behind `isSupabaseConfigured`.
 */
export function updateWikiPageLive(
  asociatieId: string,
  id: string,
  title: string,
  body: string,
): void {
  useWikiStore.getState().updatePage(asociatieId, id, title, body);
  if (!isSupabaseConfigured) return;
  void (async () => {
    try {
      await supabase
        .from('wiki_pages')
        .update({ title: title.trim(), body_md: body.trim(), updated_at: new Date().toISOString() })
        .eq('id', id);
    } catch (err) {
      reportError(err, { source: 'wikiApi.update' });
    }
  })();
}
