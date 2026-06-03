import type { Supplier } from '@/shared/types/domain';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { reportError } from '@/shared/lib/errorReporting';
import { useSuppliersStore } from './suppliersStore';

interface SupplierRow {
  id: string;
  asociatie_id: string;
  name: string | null;
  kind: string | null;
  contact: string | null;
  account_number: string | null;
  contract_start: string | null;
  contract_end: string | null;
  last_invoice_date: string | null;
}

function rowToSupplier(row: SupplierRow): Supplier {
  return {
    id: row.id,
    asociatie_id: row.asociatie_id,
    name: row.name ?? '',
    kind: row.kind ?? '',
    contact: row.contact,
    account_number: row.account_number,
    contract_start: row.contract_start,
    contract_end: row.contract_end,
    last_invoice_date: row.last_invoice_date,
  };
}

/**
 * Hydrate one asociatie's suppliers from the backend. Reads `suppliers`
 * ordered by contract_end ascending (soonest first; nulls last).
 * No-op when the backend is absent or the id is empty.
 */
export async function hydrateSuppliers(asociatieId: string): Promise<void> {
  if (!isSupabaseConfigured || !asociatieId) return;
  const store = useSuppliersStore.getState();
  try {
    const { data, error } = await supabase
      .from('suppliers')
      .select(
        'id, asociatie_id, name, kind, contact, account_number, contract_start, contract_end, last_invoice_date',
      )
      .eq('asociatie_id', asociatieId)
      .order('contract_end', { ascending: true, nullsFirst: false });
    if (error || !data) {
      reportError(error ?? new Error('no data'), { source: 'suppliersApi.hydrate' });
      store.setFetchError('load');
      return;
    }
    store.setFetchError(null);
    store.replaceForAsociatie(asociatieId, (data as SupplierRow[]).map(rowToSupplier));
  } catch (err) {
    reportError(err, { source: 'suppliersApi.hydrate' });
    store.setFetchError('load');
  }
}

/**
 * Add a supplier: apply to the store synchronously then mirror an insert
 * to `suppliers` behind `isSupabaseConfigured`.
 */
export function addSupplierLive(asociatieId: string, supplier: Supplier): void {
  useSuppliersStore.getState().addSupplier(asociatieId, supplier);
  if (!isSupabaseConfigured) return;
  void (async () => {
    try {
      await supabase.from('suppliers').insert({
        id: supplier.id,
        asociatie_id: asociatieId,
        name: supplier.name,
        kind: supplier.kind,
        contact: supplier.contact,
        account_number: supplier.account_number,
        contract_start: supplier.contract_start,
        contract_end: supplier.contract_end,
        last_invoice_date: supplier.last_invoice_date,
      });
    } catch (err) {
      reportError(err, { source: 'suppliersApi.add' });
    }
  })();
}
