import type { KidsAgeRange, KidsEvent } from '@/shared/types/domain';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { reportError } from '@/shared/lib/errorReporting';
import { assertAggregateOnly, KIDS_AGE_RANGE_FIELDS } from '@/shared/lib/minorsGuard';
import { useKidsStore } from './kidsStore';
import type { KidsCatalog } from './kidsLogic';

interface RangeRow {
  id: string;
  asociatie_id: string;
  user_id: string | null;
  bucket: string | null;
  count_num: number | null;
}

interface EventRow {
  id: string;
  asociatie_id: string;
  title: string | null;
  date: string | null;
  time: string | null;
  location: string | null;
  bucket: string | null;
  note: string | null;
  interested: number | null;
  organizer_user_id: string | null;
  organizer_name: string | null;
  created_at: string;
}

function rowToRange(row: RangeRow): KidsAgeRange {
  const r: KidsAgeRange = {
    id: row.id,
    asociatie_id: row.asociatie_id,
    user_id: row.user_id ?? '',
    bucket: (row.bucket ?? '4-6') as KidsAgeRange['bucket'],
    count: row.count_num ?? 1,
  };
  assertAggregateOnly(r, KIDS_AGE_RANGE_FIELDS, 'kids_age_ranges');
  return r;
}

function rowToEvent(row: EventRow): KidsEvent {
  return {
    id: row.id,
    asociatie_id: row.asociatie_id,
    title: row.title ?? '',
    date: row.date ?? '',
    time: row.time ?? '',
    location: row.location ?? '',
    bucket: (row.bucket ?? 'all') as KidsEvent['bucket'],
    note: row.note ?? '',
    interested: row.interested ?? 0,
    organizer_user_id: row.organizer_user_id ?? '',
    organizer_name: row.organizer_name ?? '',
    created_at: row.created_at,
  };
}

export async function hydrateKids(asociatieId: string): Promise<void> {
  if (!isSupabaseConfigured || !asociatieId) return;
  const store = useKidsStore.getState();
  try {
    const [rangesRes, eventsRes] = await Promise.all([
      supabase
        .from('kids_age_ranges')
        .select('id,asociatie_id,user_id,bucket,count_num')
        .eq('asociatie_id', asociatieId)
        .not('bucket', 'is', null),
      supabase
        .from('kids_events')
        .select('id,asociatie_id,title,date,time,location,bucket,note,interested,organizer_user_id,organizer_name,created_at')
        .eq('asociatie_id', asociatieId)
        .not('date', 'is', null)
        .order('created_at', { ascending: false }),
    ]);
    if (rangesRes.error || eventsRes.error || !rangesRes.data || !eventsRes.data) {
      reportError(rangesRes.error ?? eventsRes.error ?? new Error('no data'), {
        source: 'kidsApi.hydrate',
      });
      store.setFetchError('load');
      return;
    }
    const catalog: KidsCatalog = {
      ranges: (rangesRes.data as RangeRow[]).map(rowToRange),
      events: (eventsRes.data as EventRow[]).map(rowToEvent),
    };
    store.setFetchError(null);
    store.replaceForAsociatie(asociatieId, catalog);
  } catch (err) {
    reportError(err, { source: 'kidsApi.hydrate' });
    store.setFetchError('load');
  }
}

export function registerKidsLive(asociatieId: string, range: KidsAgeRange): void {
  useKidsStore.getState().registerKids(asociatieId, range.user_id, '', range.bucket, range.count);
  if (!isSupabaseConfigured) return;
  void (async () => {
    try {
      await supabase.from('kids_age_ranges').upsert(
        {
          id: range.id,
          asociatie_id: asociatieId,
          user_id: range.user_id,
          bucket: range.bucket,
          count_num: range.count,
        },
        { onConflict: 'asociatie_id,user_id,bucket' },
      );
    } catch (err) {
      reportError(err, { source: 'kidsApi.register' });
    }
  })();
}

export function updateKidsEventLive(asociatieId: string, event: KidsEvent): void {
  useKidsStore.getState().updateEvent(asociatieId, event);
  if (!isSupabaseConfigured) return;
  void (async () => {
    try {
      await supabase
        .from('kids_events')
        .update({
          title: event.title,
          date: event.date,
          time: event.time,
          location: event.location,
          bucket: event.bucket,
          note: event.note,
        })
        .eq('id', event.id);
    } catch (err) {
      reportError(err, { source: 'kidsApi.updateEvent' });
    }
  })();
}

export function addKidsEventLive(asociatieId: string, event: KidsEvent): void {
  useKidsStore.getState().addEvent(asociatieId, event);
  if (!isSupabaseConfigured) return;
  void (async () => {
    try {
      await supabase.from('kids_events').insert({
        id: event.id,
        asociatie_id: asociatieId,
        title: event.title,
        date: event.date,
        time: event.time,
        location: event.location,
        bucket: event.bucket,
        note: event.note,
        organizer_user_id: event.organizer_user_id,
        organizer_name: event.organizer_name,
      });
    } catch (err) {
      reportError(err, { source: 'kidsApi.addEvent' });
    }
  })();
}
