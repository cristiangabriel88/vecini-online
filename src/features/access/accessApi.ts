import type { AccessCode } from '@/shared/types/domain';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { reportError } from '@/shared/lib/errorReporting';
import { useAccessStore } from './accessStore';

interface AccessRow {
  id: string;
  asociatie_id: string;
  generated_by: string | null;
  code: string | null;
  expires_at: string | null;
  used_at: string | null;
  created_at: string;
}

function rowToCode(row: AccessRow): AccessCode {
  return {
    id: row.id,
    asociatie_id: row.asociatie_id,
    generated_by: row.generated_by ?? '',
    code: row.code ?? '',
    expires_at: row.expires_at ?? '',
    used_at: row.used_at,
    created_at: row.created_at,
  };
}

/**
 * Hydrate one asociatie's access codes from the backend. The live path reads
 * DB-stamped expires_at so the 30-min window is server-authoritative. Reads
 * the last 50 codes newest first. No-op offline.
 */
export async function hydrateAccessCodes(asociatieId: string): Promise<void> {
  if (!isSupabaseConfigured || !asociatieId) return;
  const store = useAccessStore.getState();
  try {
    const { data, error } = await supabase
      .from('access_codes')
      .select('id, asociatie_id, generated_by, code, expires_at, used_at, created_at')
      .eq('asociatie_id', asociatieId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error || !data) {
      reportError(error ?? new Error('no data'), { source: 'accessApi.hydrate' });
      store.setFetchError('load');
      return;
    }
    store.setFetchError(null);
    store.replaceForAsociatie(asociatieId, (data as AccessRow[]).map(rowToCode));
  } catch (err) {
    reportError(err, { source: 'accessApi.hydrate' });
    store.setFetchError('load');
  }
}

/**
 * Generate an access code: apply to the store synchronously then mirror an
 * insert to `access_codes` behind `isSupabaseConfigured`.
 */
export function persistAccessCode(asociatieId: string, code: AccessCode): void {
  useAccessStore.getState().addCode(asociatieId, code);
  if (!isSupabaseConfigured) return;
  void (async () => {
    try {
      await supabase.from('access_codes').insert({
        id: code.id,
        asociatie_id: asociatieId,
        generated_by: code.generated_by || null,
        code: code.code,
        expires_at: code.expires_at,
      });
    } catch (err) {
      reportError(err, { source: 'accessApi.persist' });
    }
  })();
}
