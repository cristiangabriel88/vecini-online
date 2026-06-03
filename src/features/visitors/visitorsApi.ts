import type { VisitorReport } from '@/shared/types/domain';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { reportError } from '@/shared/lib/errorReporting';
import { useVisitorsStore } from './visitorsStore';

interface VisitorRow {
  id: string;
  asociatie_id: string;
  reporter_user_id: string | null;
  reporter_name: string | null;
  note: string | null;
  photo_path: string | null;
  status: string;
  created_at: string;
}

function rowToReport(row: VisitorRow): VisitorReport {
  return {
    id: row.id,
    asociatie_id: row.asociatie_id,
    reporter_user_id: row.reporter_user_id ?? '',
    reporter_name: row.reporter_name ?? '',
    note: row.note ?? '',
    photo_path: row.photo_path,
    status: (row.status as VisitorReport['status']) ?? 'nou',
    created_at: row.created_at,
  };
}

/**
 * Hydrate one asociatie's visitor reports from the backend. No-op offline.
 */
export async function hydrateVisitors(asociatieId: string): Promise<void> {
  if (!isSupabaseConfigured || !asociatieId) return;
  const store = useVisitorsStore.getState();
  try {
    const { data, error } = await supabase
      .from('visitor_reports')
      .select('id, asociatie_id, reporter_user_id, reporter_name, note, photo_path, status, created_at')
      .eq('asociatie_id', asociatieId)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error || !data) {
      reportError(error ?? new Error('no data'), { source: 'visitorsApi.hydrate' });
      store.setFetchError('load');
      return;
    }
    store.setFetchError(null);
    store.replaceForAsociatie(asociatieId, (data as VisitorRow[]).map(rowToReport));
  } catch (err) {
    reportError(err, { source: 'visitorsApi.hydrate' });
    store.setFetchError('load');
  }
}

/**
 * Add a visitor report: update store synchronously then mirror insert to DB.
 */
export function addVisitorReportLive(asociatieId: string, report: VisitorReport): void {
  useVisitorsStore.getState().addReport(asociatieId, report);
  if (!isSupabaseConfigured) return;
  void (async () => {
    try {
      await supabase.from('visitor_reports').insert({
        id: report.id,
        asociatie_id: asociatieId,
        reporter_user_id: report.reporter_user_id || null,
        reporter_name: report.reporter_name,
        note: report.note,
        photo_path: report.photo_path ?? null,
        status: report.status,
      });
    } catch (err) {
      reportError(err, { source: 'visitorsApi.add' });
    }
  })();
}

/**
 * Cycle a report's status: update store synchronously then mirror DB update.
 */
export function cycleVisitorStatusLive(asociatieId: string, id: string, newStatus: VisitorReport['status']): void {
  useVisitorsStore.getState().cycleStatus(asociatieId, id);
  if (!isSupabaseConfigured) return;
  void (async () => {
    try {
      await supabase.from('visitor_reports').update({ status: newStatus }).eq('id', id);
    } catch (err) {
      reportError(err, { source: 'visitorsApi.cycleStatus' });
    }
  })();
}
