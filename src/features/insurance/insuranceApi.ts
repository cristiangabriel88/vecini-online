import type { InsurancePolicy } from '@/shared/types/domain';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { reportError } from '@/shared/lib/errorReporting';
import { useInsuranceStore } from './insuranceStore';

interface InsuranceRow {
  id: string;
  asociatie_id: string;
  insurer: string | null;
  policy_number: string | null;
  expires_at: string | null;
  document_path: string | null;
}

function rowToPolicy(row: InsuranceRow): InsurancePolicy {
  return {
    id: row.id,
    asociatie_id: row.asociatie_id,
    insurer: row.insurer ?? '',
    policy_number: row.policy_number ?? '',
    expires_at: row.expires_at ?? '',
    document_path: row.document_path,
  };
}

/**
 * Hydrate one asociatie's insurance policies from the backend. No-op offline.
 */
export async function hydrateInsurance(asociatieId: string): Promise<void> {
  if (!isSupabaseConfigured || !asociatieId) return;
  const store = useInsuranceStore.getState();
  try {
    const { data, error } = await supabase
      .from('insurance_policies')
      .select('id, asociatie_id, insurer, policy_number, expires_at, document_path')
      .eq('asociatie_id', asociatieId)
      .order('expires_at', { ascending: true });
    if (error || !data) {
      reportError(error ?? new Error('no data'), { source: 'insuranceApi.hydrate' });
      store.setFetchError('load');
      return;
    }
    store.setFetchError(null);
    store.replaceForAsociatie(asociatieId, (data as InsuranceRow[]).map(rowToPolicy));
  } catch (err) {
    reportError(err, { source: 'insuranceApi.hydrate' });
    store.setFetchError('load');
  }
}

/**
 * Add an insurance policy: update store synchronously then mirror insert to DB.
 */
export function addInsurancePolicyLive(asociatieId: string, policy: InsurancePolicy): void {
  useInsuranceStore.getState().addPolicy(asociatieId, policy);
  if (!isSupabaseConfigured) return;
  void (async () => {
    try {
      await supabase.from('insurance_policies').insert({
        id: policy.id,
        asociatie_id: asociatieId,
        insurer: policy.insurer,
        policy_number: policy.policy_number,
        expires_at: policy.expires_at,
        document_path: policy.document_path ?? null,
      });
    } catch (err) {
      reportError(err, { source: 'insuranceApi.add' });
    }
  })();
}
