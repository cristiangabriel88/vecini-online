import type { FeedbackSentiment, PlatformFeedback } from '@/shared/types/domain';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { reportError } from '@/shared/lib/errorReporting';
import { useFeedbackStore } from './feedbackStore';

interface FeedbackRow {
  id: string;
  asociatie_id: string | null;
  user_id: string | null;
  anonymous: boolean | null;
  body: string | null;
  sentiment: string | null;
  created_at: string;
}

function rowToFeedback(row: FeedbackRow): PlatformFeedback {
  return {
    id: row.id,
    asociatie_id: row.asociatie_id,
    user_id: row.user_id,
    anonymous: row.anonymous ?? false,
    body: row.body ?? '',
    sentiment: (row.sentiment ?? 'idee') as FeedbackSentiment,
    created_at: row.created_at,
  };
}

export async function hydrateFeedback(asociatieId: string): Promise<void> {
  if (!isSupabaseConfigured || !asociatieId) return;
  const store = useFeedbackStore.getState();
  try {
    const { data, error } = await supabase
      .from('platform_feedback')
      .select('id,asociatie_id,user_id,anonymous,body,sentiment,created_at')
      .eq('asociatie_id', asociatieId)
      .order('created_at', { ascending: false });
    if (error || !data) {
      reportError(error ?? new Error('no data'), { source: 'feedbackApi.hydrate' });
      store.setFetchError('load');
      return;
    }
    store.setFetchError(null);
    store.replaceForAsociatie(asociatieId, (data as FeedbackRow[]).map(rowToFeedback));
  } catch (err) {
    reportError(err, { source: 'feedbackApi.hydrate' });
    store.setFetchError('load');
  }
}

export function addFeedbackLive(asociatieId: string, item: PlatformFeedback): void {
  useFeedbackStore.getState().addItem(asociatieId, item);
  if (!isSupabaseConfigured) return;
  void (async () => {
    try {
      await supabase.from('platform_feedback').insert({
        id: item.id,
        asociatie_id: item.anonymous ? null : asociatieId,
        user_id: item.user_id,
        anonymous: item.anonymous,
        body: item.body,
        sentiment: item.sentiment,
      });
    } catch (err) {
      reportError(err, { source: 'feedbackApi.add' });
    }
  })();
}
