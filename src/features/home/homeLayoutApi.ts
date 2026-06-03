import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { reportError } from '@/shared/lib/errorReporting';
import type { HomeCard } from './homeLayoutLogic';
import { useHomeLayoutStore } from './homeLayoutStore';

/* Dual-mode home layout repository (F67, T106). The Zustand store is the
   synchronous source of truth; these functions sync with the `home_layouts`
   table (owner RLS, one row per resident per asociatie) when a backend is
   configured. Offline-first: every function guards on `isSupabaseConfigured`
   and falls back silently so the demo experience is unchanged.
   The component reconciles raw cards against the current feature flags exactly
   as it does offline (via reconcileLayout in a useMemo). */

/**
 * Load the resident's saved layout for the active asociatie from the DB and
 * write raw cards to the local store. No-op when Supabase is not configured
 * or either id is empty. On error, silently retains the local state.
 */
export async function hydrateHomeLayout(
  residentId: string,
  asociatieId: string,
): Promise<void> {
  if (!isSupabaseConfigured || !residentId || !asociatieId) return;
  try {
    const { data, error } = await supabase
      .from('home_layouts')
      .select('cards')
      .eq('resident_user_id', residentId)
      .eq('asociatie_id', asociatieId)
      .maybeSingle();
    if (error) {
      reportError(new Error(error.message), { source: 'homeLayoutApi.hydrate' });
      return;
    }
    if (!data) return;
    const cards = Array.isArray(data.cards) ? (data.cards as HomeCard[]) : [];
    useHomeLayoutStore.getState().save(residentId, asociatieId, cards);
  } catch (err) {
    reportError(err instanceof Error ? err : new Error(String(err)), {
      source: 'homeLayoutApi.hydrate',
    });
  }
}

/**
 * Upsert the resident's layout to `home_layouts`. The store must already be
 * updated synchronously before this call; this only mirrors the change to DB.
 * No-op when Supabase is not configured or either id is empty.
 */
export async function persistHomeLayout(
  residentId: string,
  asociatieId: string,
  cards: HomeCard[],
): Promise<void> {
  if (!isSupabaseConfigured || !residentId || !asociatieId) return;
  try {
    const { error } = await supabase
      .from('home_layouts')
      .upsert(
        { resident_user_id: residentId, asociatie_id: asociatieId, cards },
        { onConflict: 'resident_user_id,asociatie_id' },
      );
    if (error) {
      reportError(new Error(error.message), { source: 'homeLayoutApi.persist' });
    }
  } catch (err) {
    reportError(err instanceof Error ? err : new Error(String(err)), {
      source: 'homeLayoutApi.persist',
    });
  }
}

/**
 * Delete the resident's layout row from `home_layouts` when the layout is
 * reset to the default. No-op when Supabase is not configured or either id
 * is empty.
 */
export async function deleteHomeLayout(
  residentId: string,
  asociatieId: string,
): Promise<void> {
  if (!isSupabaseConfigured || !residentId || !asociatieId) return;
  try {
    const { error } = await supabase
      .from('home_layouts')
      .delete()
      .eq('resident_user_id', residentId)
      .eq('asociatie_id', asociatieId);
    if (error) {
      reportError(new Error(error.message), { source: 'homeLayoutApi.delete' });
    }
  } catch (err) {
    reportError(err instanceof Error ? err : new Error(String(err)), {
      source: 'homeLayoutApi.delete',
    });
  }
}
