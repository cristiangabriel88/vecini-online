import type { ProjectPhoto } from '@/shared/types/domain';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { reportError } from '@/shared/lib/errorReporting';
import { usePhotoJournalStore } from './photoJournalStore';
import { swatchForIndex } from './photoJournalLogic';

interface PhotoRow {
  id: string;
  asociatie_id: string;
  project_id: string | null;
  caption: string | null;
  taken_at: string | null;
  created_at: string;
  projects: { title: string | null } | { title: string | null }[] | null;
}

function rowToPhoto(row: PhotoRow, index: number): ProjectPhoto {
  const proj = Array.isArray(row.projects) ? row.projects[0] : row.projects;
  return {
    id: row.id,
    asociatie_id: row.asociatie_id,
    project_id: row.project_id ?? '',
    project_title: proj?.title ?? '',
    date: row.taken_at ?? row.created_at.slice(0, 10),
    caption: row.caption ?? '',
    phase: '',
    swatch: swatchForIndex(index),
    author_name: '',
    created_at: row.created_at,
  };
}

export async function hydratePhotos(asociatieId: string): Promise<void> {
  if (!isSupabaseConfigured || !asociatieId) return;
  const store = usePhotoJournalStore.getState();
  try {
    const { data, error } = await supabase
      .from('project_photos')
      .select('id, asociatie_id, project_id, caption, taken_at, created_at, projects(title)')
      .eq('asociatie_id', asociatieId)
      .order('taken_at', { ascending: false });
    if (error || !data) {
      reportError(error ?? new Error('no data'), { source: 'photoJournalApi.hydrate' });
      store.setFetchError('load');
      return;
    }
    store.setFetchError(null);
    store.replaceForAsociatie(
      asociatieId,
      (data as PhotoRow[]).map((row, i) => rowToPhoto(row, i)),
    );
  } catch (err) {
    reportError(err, { source: 'photoJournalApi.hydrate' });
    store.setFetchError('load');
  }
}

export function addPhotoLive(asociatieId: string, photo: ProjectPhoto): void {
  usePhotoJournalStore.getState().addPhoto(asociatieId, photo);
  if (!isSupabaseConfigured) return;
  void (async () => {
    try {
      await supabase.from('project_photos').insert({
        id: photo.id,
        asociatie_id: asociatieId,
        project_id: photo.project_id || null,
        caption: photo.caption,
        taken_at: photo.date,
      });
    } catch (err) {
      reportError(err, { source: 'photoJournalApi.add' });
    }
  })();
}
