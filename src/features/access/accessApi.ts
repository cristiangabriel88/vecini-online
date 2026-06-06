import type { AccessCode } from '@/shared/types/domain';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { reportError } from '@/shared/lib/errorReporting';
import { runHydration } from '@/shared/lib/runHydration';
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

export async function hydrateAccessCodes(asociatieId: string): Promise<void> {
  return runHydration<AccessRow, AccessCode>(asociatieId, {
    query: () =>
      supabase
        .from('access_codes')
        .select('id, asociatie_id, generated_by, code, expires_at, used_at, created_at')
        .eq('asociatie_id', asociatieId)
        .order('created_at', { ascending: false })
        .limit(50),
    transform: rowToCode,
    store: useAccessStore.getState(),
    source: 'accessApi.hydrate',
  });
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
