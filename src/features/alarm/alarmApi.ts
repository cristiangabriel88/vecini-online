import type { AlarmEvent, AlarmSystem } from '@/shared/types/domain';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { reportError } from '@/shared/lib/errorReporting';
import { useAlarmStore } from './alarmStore';

interface AlarmSystemRow {
  id: string;
  asociatie_id: string;
  name: string | null;
  status: string | null;
  last_test: string | null;
}

interface AlarmEventRow {
  id: string;
  system_id: string;
  kind: string | null;
  occurred_at: string;
}

function rowToSystem(row: AlarmSystemRow, events: AlarmEventRow[]): AlarmSystem {
  return {
    id: row.id,
    asociatie_id: row.asociatie_id,
    name: row.name ?? '',
    status: (row.status as AlarmSystem['status']) ?? 'ok',
    last_test: row.last_test,
    events: events
      .filter((e) => e.system_id === row.id)
      .map((e): AlarmEvent => ({ id: e.id, system_id: e.system_id, kind: e.kind ?? '', occurred_at: e.occurred_at })),
  };
}

/**
 * Hydrate alarm systems and recent events from the backend. No-op offline.
 */
export async function hydrateAlarm(asociatieId: string): Promise<void> {
  if (!isSupabaseConfigured || !asociatieId) return;
  const store = useAlarmStore.getState();
  try {
    const [systemsRes, eventsRes] = await Promise.all([
      supabase
        .from('alarm_systems')
        .select('id, asociatie_id, name, status, last_test')
        .eq('asociatie_id', asociatieId)
        .order('name', { ascending: true }),
      supabase
        .from('alarm_events')
        .select('id, system_id, kind, occurred_at')
        .eq('asociatie_id', asociatieId)
        .order('occurred_at', { ascending: false })
        .limit(200),
    ]);
    if (systemsRes.error || eventsRes.error) {
      const err = systemsRes.error ?? eventsRes.error;
      reportError(err ?? new Error('no data'), { source: 'alarmApi.hydrate' });
      store.setFetchError('load');
      return;
    }
    const events = (eventsRes.data ?? []) as AlarmEventRow[];
    store.setFetchError(null);
    store.replaceForAsociatie(asociatieId, (systemsRes.data as AlarmSystemRow[]).map((r) => rowToSystem(r, events)));
  } catch (err) {
    reportError(err, { source: 'alarmApi.hydrate' });
    store.setFetchError('load');
  }
}

/**
 * Add an alarm system: update store synchronously then mirror insert to DB.
 */
export function addAlarmSystemLive(asociatieId: string, system: AlarmSystem): void {
  useAlarmStore.getState().addSystem(asociatieId, system);
  if (!isSupabaseConfigured) return;
  void (async () => {
    try {
      await supabase.from('alarm_systems').insert({
        id: system.id,
        asociatie_id: asociatieId,
        name: system.name,
        status: system.status,
        last_test: system.last_test ?? null,
      });
    } catch (err) {
      reportError(err, { source: 'alarmApi.add' });
    }
  })();
}

/**
 * Log a test: update store synchronously, mirror last_test + event to DB.
 */
export function logAlarmTestLive(asociatieId: string, id: string): void {
  useAlarmStore.getState().logTest(asociatieId, id);
  if (!isSupabaseConfigured) return;
  const today = new Date().toISOString().slice(0, 10);
  void (async () => {
    try {
      await supabase.from('alarm_systems').update({ status: 'ok', last_test: today }).eq('id', id);
      await supabase.from('alarm_events').insert({
        asociatie_id: asociatieId,
        system_id: id,
        kind: 'Test efectuat',
        occurred_at: new Date().toISOString(),
      });
    } catch (err) {
      reportError(err, { source: 'alarmApi.logTest' });
    }
  })();
}

/**
 * Report a fault: update store synchronously, mirror status + event to DB.
 */
export function reportAlarmFaultLive(asociatieId: string, id: string): void {
  useAlarmStore.getState().reportFault(asociatieId, id);
  if (!isSupabaseConfigured) return;
  void (async () => {
    try {
      await supabase.from('alarm_systems').update({ status: 'defect' }).eq('id', id);
      await supabase.from('alarm_events').insert({
        asociatie_id: asociatieId,
        system_id: id,
        kind: 'Defectiune semnalata',
        occurred_at: new Date().toISOString(),
      });
    } catch (err) {
      reportError(err, { source: 'alarmApi.reportFault' });
    }
  })();
}
