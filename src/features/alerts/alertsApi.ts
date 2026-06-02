import type { Alert } from '@/shared/types/domain';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { reportError } from '@/shared/lib/errorReporting';
import { type NewAlertInput, alertsForAsociatie, newAlert } from './alertsLogic';
import { useAlertsStore } from './alertsStore';

/* Dual-mode emergency-alerts repository (F03, T184). The zustand store is the
   synchronous source of truth the page reads; these functions apply each change
   there and, when a backend is configured, mirror it to `alerts` under RLS
   (members read; admin/presedinte/comitet write).

   The demo/offline store stays the default when Supabase is absent. */

/** Hydrate the alerts for one asociație from the backend, when configured. The
 *  demo store is the source of truth if the read fails or backend is absent. */
export async function hydrateAlerts(asociatieId: string): Promise<void> {
  if (!isSupabaseConfigured || !asociatieId) return;
  const store = useAlertsStore.getState();
  try {
    const { data, error } = await supabase
      .from('alerts')
      .select('id, asociatie_id, sender_user_id, title, body, kind, recipient_count, sent_at')
      .eq('asociatie_id', asociatieId)
      .order('sent_at', { ascending: false });
    if (error || !data) {
      reportError(error ?? new Error('no data'), { source: 'alertsApi.hydrate' });
      store.setFetchError('load');
      return;
    }
    store.setFetchError(null);
    store.replaceForAsociatie(asociatieId, data as Alert[]);
  } catch (err) {
    reportError(err, { source: 'alertsApi.hydrate' });
    store.setFetchError('load');
  }
}

/** Send an emergency alert: updates the store synchronously and mirrors to the
 *  `alerts` table when a backend is configured. Returns the recorded alert. */
export function sendAlert(
  asociatieId: string,
  senderUserId: string,
  input: NewAlertInput,
  recipients: number,
): Alert {
  const item = newAlert(input, asociatieId, senderUserId, recipients);
  const state = useAlertsStore.getState();
  const current = alertsForAsociatie(state.byAsociatie, asociatieId);
  state.replaceForAsociatie(asociatieId, [item, ...current]);
  if (isSupabaseConfigured) {
    void (async () => {
      try {
        await supabase.from('alerts').insert({
          id: item.id,
          asociatie_id: item.asociatie_id,
          sender_user_id: item.sender_user_id,
          title: item.title,
          body: item.body,
          kind: item.kind,
          recipient_count: item.recipient_count,
          sent_at: item.sent_at,
        });
      } catch (err) {
        reportError(err, { source: 'alertsApi.send' });
      }
    })();
  }
  return item;
}
