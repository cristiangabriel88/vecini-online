import type { PsiAsset } from '@/shared/types/domain';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { reportError } from '@/shared/lib/errorReporting';
import { usePsiStore } from './psiStore';

interface PsiRow {
  id: string;
  asociatie_id: string;
  asset: string | null;
  kind: string | null;
  location: string | null;
  next_check: string | null;
}

function rowToAsset(row: PsiRow): PsiAsset {
  return {
    id: row.id,
    asociatie_id: row.asociatie_id,
    asset: row.asset ?? '',
    kind: row.kind ?? 'Altele',
    location: row.location,
    next_check: row.next_check ?? '',
  };
}

/**
 * Hydrate one asociatie's PSI assets from the backend. No-op offline.
 */
export async function hydratePsiAssets(asociatieId: string): Promise<void> {
  if (!isSupabaseConfigured || !asociatieId) return;
  const store = usePsiStore.getState();
  try {
    const { data, error } = await supabase
      .from('psi_assets')
      .select('id, asociatie_id, asset, kind, location, next_check')
      .eq('asociatie_id', asociatieId)
      .order('next_check', { ascending: true });
    if (error || !data) {
      reportError(error ?? new Error('no data'), { source: 'psiApi.hydrate' });
      store.setFetchError('load');
      return;
    }
    store.setFetchError(null);
    store.replaceForAsociatie(asociatieId, (data as PsiRow[]).map(rowToAsset));
  } catch (err) {
    reportError(err, { source: 'psiApi.hydrate' });
    store.setFetchError('load');
  }
}

/**
 * Add a PSI asset: update store synchronously then mirror insert to DB.
 */
export function addPsiAssetLive(asociatieId: string, asset: PsiAsset): void {
  usePsiStore.getState().addAsset(asociatieId, asset);
  if (!isSupabaseConfigured) return;
  void (async () => {
    try {
      await supabase.from('psi_assets').insert({
        id: asset.id,
        asociatie_id: asociatieId,
        asset: asset.asset,
        kind: asset.kind,
        location: asset.location ?? null,
        next_check: asset.next_check,
      });
    } catch (err) {
      reportError(err, { source: 'psiApi.add' });
    }
  })();
}

/**
 * Mark a PSI asset as checked: update store synchronously then mirror DB update.
 */
export function markPsiCheckedLive(asociatieId: string, id: string, newNextCheck: string): void {
  usePsiStore.getState().markChecked(asociatieId, id, 365);
  if (!isSupabaseConfigured) return;
  void (async () => {
    try {
      await supabase.from('psi_assets').update({ next_check: newNextCheck }).eq('id', id);
    } catch (err) {
      reportError(err, { source: 'psiApi.markChecked' });
    }
  })();
}
