import type { FaqEntry } from '@/shared/types/domain';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { reportError } from '@/shared/lib/errorReporting';
import type { FaqEntryInput } from './faqLogic';
import { useFaqStore } from './faqStore';

/* Dual-mode FAQ repository (F07, T186). The zustand store is the synchronous
   source of truth the page reads; these functions apply each change there and,
   when a backend is configured, mirror it to `faq_entries` under RLS (members
   read; admin/presedinte/comitet write). Vote counts are aggregated through the
   attribution-free `faq_tally` RPC because faq_votes is self-read only.

   The demo/offline store stays the default when Supabase is absent. */

interface FaqRow {
  id: string;
  asociatie_id: string;
  category: string | null;
  question: string;
  answer: string;
  sort_order: number | null;
  archived: boolean | null;
}

interface TallyRow {
  faq_id: string;
  helpful_count: number;
  not_helpful_count: number;
}

/** Hydrate the FAQ entries for one asociație from the backend, when configured.
 *  The demo store is the source of truth if the read fails or backend is absent. */
export async function hydrateFaq(asociatieId: string): Promise<void> {
  if (!isSupabaseConfigured || !asociatieId) return;
  const store = useFaqStore.getState();
  try {
    const [entriesRes, tallyRes] = await Promise.all([
      supabase
        .from('faq_entries')
        .select('id, asociatie_id, category, question, answer, sort_order, archived')
        .eq('asociatie_id', asociatieId)
        .order('sort_order', { ascending: true }),
      supabase.rpc('faq_tally', { p_asociatie_id: asociatieId }),
    ]);
    if (entriesRes.error || !entriesRes.data) {
      reportError(entriesRes.error ?? new Error('no data'), { source: 'faqApi.hydrate' });
      store.setFetchError('load');
      return;
    }
    // A tally failure is non-fatal: entries still render, counts default to 0.
    if (tallyRes.error) reportError(tallyRes.error, { source: 'faqApi.hydrate.tally' });
    const counts = new Map<string, { helpful: number; not: number }>();
    for (const r of (tallyRes.data as TallyRow[] | null) ?? []) {
      counts.set(r.faq_id, { helpful: r.helpful_count, not: r.not_helpful_count });
    }
    const items: FaqEntry[] = (entriesRes.data as FaqRow[]).map((r) => {
      const c = counts.get(r.id);
      return {
        id: r.id,
        asociatie_id: r.asociatie_id,
        category: r.category ?? '',
        question: r.question,
        answer: r.answer,
        sort_order: r.sort_order ?? 0,
        helpful_count: c?.helpful ?? 0,
        not_helpful_count: c?.not ?? 0,
        archived: r.archived ?? false,
      };
    });
    store.setFetchError(null);
    store.replace(items);
  } catch (err) {
    reportError(err, { source: 'faqApi.hydrate' });
    store.setFetchError('load');
  }
}

/** Create an FAQ entry: updates the store and mirrors to `faq_entries` live. */
export function createFaqEntry(asociatieId: string, input: FaqEntryInput): FaqEntry {
  const entry = useFaqStore.getState().addEntry(asociatieId, input);
  if (isSupabaseConfigured) {
    void (async () => {
      try {
        await supabase.from('faq_entries').insert({
          id: entry.id,
          asociatie_id: entry.asociatie_id,
          category: entry.category,
          question: entry.question,
          answer: entry.answer,
          sort_order: entry.sort_order,
          archived: false,
        });
      } catch (err) {
        reportError(err, { source: 'faqApi.create' });
      }
    })();
  }
  return entry;
}

/** Edit an FAQ entry's content: updates the store and mirrors live. */
export function updateFaqEntry(id: string, input: FaqEntryInput): void {
  useFaqStore.getState().updateEntry(id, input);
  if (isSupabaseConfigured) {
    void (async () => {
      try {
        await supabase
          .from('faq_entries')
          .update({
            category: input.category.trim(),
            question: input.question.trim(),
            answer: input.answer.trim(),
          })
          .eq('id', id);
      } catch (err) {
        reportError(err, { source: 'faqApi.update' });
      }
    })();
  }
}

/** Retire an FAQ entry: archives it in the store and mirrors live. */
export function archiveFaqEntry(id: string): void {
  useFaqStore.getState().archiveEntry(id);
  if (isSupabaseConfigured) {
    void (async () => {
      try {
        await supabase.from('faq_entries').update({ archived: true }).eq('id', id);
      } catch (err) {
        reportError(err, { source: 'faqApi.archive' });
      }
    })();
  }
}
