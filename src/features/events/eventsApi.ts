import type { BuildingEvent } from '@/shared/types/domain';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { reportError } from '@/shared/lib/errorReporting';
import { isAttending } from './eventsLogic';
import { useEventsStore } from './eventsStore';

/* Dual-mode events repository (F08, T185). The zustand store is the synchronous
   source of truth the page reads; these functions apply each change there and,
   when a backend is configured, mirror it to `events` / `event_rsvps` under RLS
   (members read events + manage their own RSVP; admin/comitet write events).

   The demo/offline store stays the default when Supabase is absent. */

/** Hydrate the events + the current resident's RSVPs for one asociație from the
 *  backend, when configured. The demo store is the source of truth if the read
 *  fails or the backend is absent. */
export async function hydrateEvents(asociatieId: string, userId: string): Promise<void> {
  if (!isSupabaseConfigured || !asociatieId) return;
  const store = useEventsStore.getState();
  try {
    const [eventsRes, rsvpRes] = await Promise.all([
      supabase
        .from('events')
        .select('id, asociatie_id, title, description, location, category, starts_at, ends_at, created_by, created_at')
        .eq('asociatie_id', asociatieId)
        .order('starts_at', { ascending: true }),
      supabase.from('event_rsvps').select('event_id').eq('user_id', userId),
    ]);
    if (eventsRes.error || !eventsRes.data) {
      reportError(eventsRes.error ?? new Error('no data'), { source: 'eventsApi.hydrate' });
      store.setFetchError('load');
      return;
    }
    store.setFetchError(null);
    store.replaceForAsociatie(asociatieId, eventsRes.data as BuildingEvent[]);
    if (!rsvpRes.error && rsvpRes.data) {
      const rsvps: Record<string, boolean> = {};
      for (const row of rsvpRes.data as { event_id: string }[]) rsvps[row.event_id] = true;
      store.replaceRsvps(rsvps);
    }
  } catch (err) {
    reportError(err, { source: 'eventsApi.hydrate' });
    store.setFetchError('load');
  }
}

/** Toggle the current resident's RSVP for one event: updates the store
 *  synchronously and mirrors to `event_rsvps` when a backend is configured.
 *  Returns the new attending state. */
export function rsvpEvent(eventId: string, userId: string): boolean {
  const before = isAttending(useEventsStore.getState().rsvps, eventId);
  useEventsStore.getState().toggleRsvp(eventId);
  const now = !before;
  if (isSupabaseConfigured) {
    void (async () => {
      try {
        if (now) {
          await supabase
            .from('event_rsvps')
            .upsert({ event_id: eventId, user_id: userId, status: 'yes' });
        } else {
          await supabase
            .from('event_rsvps')
            .delete()
            .eq('event_id', eventId)
            .eq('user_id', userId);
        }
      } catch (err) {
        reportError(err, { source: 'eventsApi.rsvp' });
      }
    })();
  }
  return now;
}
