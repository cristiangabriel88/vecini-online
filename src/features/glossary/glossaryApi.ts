import type { GlossaryEntry } from '@/shared/types/domain';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { reportError } from '@/shared/lib/errorReporting';
import { useGlossaryStore } from './glossaryStore';

interface GlossaryRow {
  id: string;
  asociatie_id: string;
  term: string | null;
  definition: string | null;
}

function rowToEntry(row: GlossaryRow): GlossaryEntry {
  return {
    id: row.id,
    asociatie_id: row.asociatie_id,
    term: row.term ?? '',
    definition: row.definition ?? '',
  };
}

/**
 * Hydrate one asociatie's glossary entries from the backend. Reads
 * `glossary_entries` ordered alphabetically by term. No-op when the backend
 * is absent or id is empty.
 */
export async function hydrateGlossary(asociatieId: string): Promise<void> {
  if (!isSupabaseConfigured || !asociatieId) return;
  const store = useGlossaryStore.getState();
  try {
    const { data, error } = await supabase
      .from('glossary_entries')
      .select('id, asociatie_id, term, definition')
      .eq('asociatie_id', asociatieId)
      .order('term');
    if (error || !data) {
      reportError(error ?? new Error('no data'), { source: 'glossaryApi.hydrate' });
      store.setFetchError('load');
      return;
    }
    store.setFetchError(null);
    store.replaceForAsociatie(asociatieId, (data as GlossaryRow[]).map(rowToEntry));
  } catch (err) {
    reportError(err, { source: 'glossaryApi.hydrate' });
    store.setFetchError('load');
  }
}
