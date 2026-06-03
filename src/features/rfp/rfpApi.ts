import type { Rfp, RfpQuote } from '@/shared/types/domain';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { reportError } from '@/shared/lib/errorReporting';
import { useRfpStore } from './rfpStore';

interface RfpRow {
  id: string;
  asociatie_id: string;
  title: string | null;
  description: string | null;
  status: string;
  created_at: string;
}

interface QuoteRow {
  id: string;
  rfp_id: string;
  contractor: string | null;
  amount: number | null;
  selected: boolean;
}

function rowToRfp(row: RfpRow, quotes: RfpQuote[]): Rfp {
  return {
    id: row.id,
    asociatie_id: row.asociatie_id,
    title: row.title ?? '',
    description: row.description ?? '',
    status: row.status === 'decis' ? 'decis' : 'deschis',
    created_at: row.created_at,
    quotes,
  };
}

function rowToQuote(row: QuoteRow): RfpQuote {
  return {
    id: row.id,
    rfp_id: row.rfp_id,
    contractor: row.contractor ?? '',
    amount: row.amount ?? 0,
    selected: row.selected,
  };
}

/**
 * Hydrate one asociatie's RFP catalog from the backend. Reads `rfps` and
 * `rfp_quotes` in parallel, groups quotes by rfp_id. No-op offline.
 */
export async function hydrateRfps(asociatieId: string): Promise<void> {
  if (!isSupabaseConfigured || !asociatieId) return;
  const store = useRfpStore.getState();
  try {
    const [rfpRes, quoteRes] = await Promise.all([
      supabase
        .from('rfps')
        .select('id, asociatie_id, title, description, status, created_at')
        .eq('asociatie_id', asociatieId)
        .order('created_at', { ascending: false }),
      supabase
        .from('rfp_quotes')
        .select('id, rfp_id, contractor, amount, selected')
        .eq('asociatie_id', asociatieId),
    ]);
    if (rfpRes.error || quoteRes.error) {
      reportError(rfpRes.error ?? quoteRes.error ?? new Error('no data'), {
        source: 'rfpApi.hydrate',
      });
      store.setFetchError('load');
      return;
    }
    const quotesByRfp = new Map<string, RfpQuote[]>();
    for (const q of (quoteRes.data ?? []) as QuoteRow[]) {
      const list = quotesByRfp.get(q.rfp_id) ?? [];
      list.push(rowToQuote(q));
      quotesByRfp.set(q.rfp_id, list);
    }
    store.setFetchError(null);
    store.replaceForAsociatie(
      asociatieId,
      ((rfpRes.data ?? []) as RfpRow[]).map((r) => rowToRfp(r, quotesByRfp.get(r.id) ?? [])),
    );
  } catch (err) {
    reportError(err, { source: 'rfpApi.hydrate' });
    store.setFetchError('load');
  }
}

/**
 * Add a new RFP: apply to the store synchronously then mirror an insert to
 * `rfps` behind `isSupabaseConfigured`.
 */
export function addRfpItem(asociatieId: string, rfp: Rfp): void {
  useRfpStore.getState().addRfp(asociatieId, rfp);
  if (!isSupabaseConfigured) return;
  void (async () => {
    try {
      await supabase.from('rfps').insert({
        id: rfp.id,
        asociatie_id: asociatieId,
        title: rfp.title,
        description: rfp.description,
        status: rfp.status,
      });
    } catch (err) {
      reportError(err, { source: 'rfpApi.addRfp' });
    }
  })();
}

/**
 * Add a contractor quote: apply to the store synchronously then mirror an
 * insert to `rfp_quotes` behind `isSupabaseConfigured`.
 */
export function addRfpQuote(asociatieId: string, rfpId: string, quote: RfpQuote): void {
  useRfpStore.getState().addQuote(asociatieId, rfpId, quote);
  if (!isSupabaseConfigured) return;
  void (async () => {
    try {
      await supabase.from('rfp_quotes').insert({
        id: quote.id,
        asociatie_id: asociatieId,
        rfp_id: rfpId,
        contractor: quote.contractor,
        amount: quote.amount,
      });
    } catch (err) {
      reportError(err, { source: 'rfpApi.addQuote' });
    }
  })();
}

/**
 * Mark a winner: apply to the store synchronously then update `rfps` status
 * and `rfp_quotes` selected flag behind `isSupabaseConfigured`.
 */
export function decideRfpItem(asociatieId: string, rfpId: string, quoteId: string): void {
  useRfpStore.getState().decide(asociatieId, rfpId, quoteId);
  if (!isSupabaseConfigured) return;
  void (async () => {
    try {
      await Promise.all([
        supabase
          .from('rfps')
          .update({ status: 'decis' })
          .eq('id', rfpId)
          .eq('asociatie_id', asociatieId),
        supabase
          .from('rfp_quotes')
          .update({ selected: false })
          .eq('rfp_id', rfpId)
          .eq('asociatie_id', asociatieId),
      ]);
      await supabase
        .from('rfp_quotes')
        .update({ selected: true })
        .eq('id', quoteId)
        .eq('rfp_id', rfpId);
    } catch (err) {
      reportError(err, { source: 'rfpApi.decide' });
    }
  })();
}
