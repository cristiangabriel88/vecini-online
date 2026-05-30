import type { Announcement } from '@/shared/types/domain';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { reportError } from '@/shared/lib/errorReporting';
import {
  type NewAnnouncementInput,
  announcementsForAsociatie,
  newAnnouncement,
} from './announcementsLogic';
import { useAnnouncementsStore } from './announcementsStore';

/* Dual-mode announcements repository (F01, T57). The zustand store is the
   synchronous source of truth the page reads; these functions apply each change
   there and, when a backend is configured, mirror it to `announcements` under
   RLS (members read; admin/presedinte/comitet write).

   The demo/offline store stays the default when Supabase is absent. */

/** Hydrate the announcements for one asociație from the backend, when configured.
 *  The demo store is the source of truth if the read fails or backend is absent. */
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
    store.setFetchError(null);
    store.replaceForAsociatie(asociatieId, data as Announcement[]);
  } catch (err) {
    reportError(err, { source: 'announcementsApi.hydrate' });
    store.setFetchError('load');
  }
}

/** Publish an announcement: updates the store synchronously and mirrors to the
 *  `announcements` table when a backend is configured. */
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
          published_at: item.published_at,
          created_at: item.created_at,
          updated_at: item.updated_at,
        });
      } catch (err) {
        reportError(err, { source: 'announcementsApi.publish' });
      }
    })();
  }
}
