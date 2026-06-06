import { isSupabaseConfigured } from '@/shared/lib/supabase';
import { reportError } from '@/shared/lib/errorReporting';

/**
 * Minimal store interface required by runHydration.
 * Matches the base shape produced by createAsociatieStore.
 */
export type HydrationStore<T> = {
  replaceForAsociatie: (asociatieId: string, items: T[]) => void;
  setFetchError: (msg: string | null) => void;
};

/**
 * Shared single-table hydration shell.
 *
 * Handles the isSupabaseConfigured guard, try/catch, error reporting,
 * and store update so each feature hydrator only supplies its query, row
 * mapper, store reference, and error-source tag.
 *
 * Intentionally NOT used by multi-table / join-based hydrators that need
 * per-feature assembly logic:
 *   alarmApi     (alarm_systems + alarm_events parallel fetch)
 *   eventsApi    (events + event_rsvps parallel fetch)
 *   projectsApi  (projects + project_phases parallel fetch)
 *   budgetApi    (budget_cycles + budget_proposals + budget_votes sequential)
 *   pollsApi     (polls + poll_options + RPC tally)
 *   ticketsApi   (tickets with nested ticket_attachments select)
 */
export async function runHydration<Row, T>(
  asociatieId: string,
  opts: {
    query: () => PromiseLike<{ data: unknown; error: unknown }>;
    transform: (row: Row) => T;
    store: HydrationStore<T>;
    source: string;
  },
): Promise<void> {
  if (!isSupabaseConfigured || !asociatieId) return;
  try {
    const { data, error } = await opts.query();
    if (error || !Array.isArray(data)) {
      reportError(error ?? new Error('no data'), { source: opts.source });
      opts.store.setFetchError('load');
      return;
    }
    opts.store.setFetchError(null);
    opts.store.replaceForAsociatie(asociatieId, (data as Row[]).map(opts.transform));
  } catch (err) {
    reportError(err, { source: opts.source });
    opts.store.setFetchError('load');
  }
}
