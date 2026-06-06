import type { Alert } from '@/shared/types/domain';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { reportError } from '@/shared/lib/errorReporting';
import { runHydration } from '@/shared/lib/runHydration';
import { type NewAlertInput, alertsForAsociatie, newAlert } from './alertsLogic';
import { useAlertsStore } from './alertsStore';

/* Dual-mode emergency-alerts repository (F03, T184). The zustand store is the
   synchronous source of truth the page reads; these functions apply each change
   there and, when a backend is configured, mirror it to `alerts` under RLS
   (members read; admin/presedinte/comitet write).

   The demo/offline store stays the default when Supabase is absent. */

export async function hydrateAlerts(asociatieId: string): Promise<void> {
  return runHydration<Alert, Alert>(asociatieId, {
    query: () =>
      supabase
        .from('alerts')
        .select('id, asociatie_id, sender_user_id, title, body, kind, recipient_count, sent_at')
        .eq('asociatie_id', asociatieId)
        .order('sent_at', { ascending: false }),
    transform: (row) => row,
    store: useAlertsStore.getState(),
    source: 'alertsApi.hydrate',
  });
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
