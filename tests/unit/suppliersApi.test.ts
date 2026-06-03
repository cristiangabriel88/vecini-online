import { beforeEach, describe, expect, it } from 'vitest';
import { useSuppliersStore } from '@/features/suppliers/suppliersStore';
import { hydrateSuppliers, addSupplierLive } from '@/features/suppliers/suppliersApi';
import { suppliersForAsociatie, seedSuppliers } from '@/features/suppliers/supplierLogic';
import { DEMO_ASOCIATIE, DEMO_SUPPLIERS } from '@/shared/demo/demoData';
import type { Supplier } from '@/shared/types/domain';

// suppliersApi offline-path tests (T216).
// Key contracts:
//   - hydrateSuppliers: no-op when not configured / empty id
//   - addSupplierLive: prepends synchronously, offline-safe

const ASOC = DEMO_ASOCIATIE.id;

function makeSupplier(overrides?: Partial<Supplier>): Supplier {
  return {
    id: `sup-test-${Date.now()}`,
    asociatie_id: ASOC,
    name: 'Test Furnizor',
    kind: 'Instalatii',
    contact: null,
    account_number: null,
    contract_start: null,
    contract_end: null,
    last_invoice_date: null,
    ...overrides,
  };
}

beforeEach(() => {
  useSuppliersStore.setState({ byAsociatie: seedSuppliers(), fetchError: null });
});

describe('hydrateSuppliers', () => {
  it('is a no-op when Supabase is not configured (offline/CI)', async () => {
    const before = useSuppliersStore.getState().byAsociatie;
    await hydrateSuppliers(ASOC);
    expect(useSuppliersStore.getState().byAsociatie).toBe(before);
    expect(useSuppliersStore.getState().fetchError).toBeNull();
  });

  it('is a no-op when asociatieId is empty', async () => {
    const before = useSuppliersStore.getState().byAsociatie;
    await hydrateSuppliers('');
    expect(useSuppliersStore.getState().byAsociatie).toBe(before);
  });
});

describe('addSupplierLive', () => {
  it('prepends the supplier synchronously to the store', () => {
    const before = suppliersForAsociatie(useSuppliersStore.getState().byAsociatie, ASOC).length;
    const supplier = makeSupplier();
    addSupplierLive(ASOC, supplier);
    const after = suppliersForAsociatie(useSuppliersStore.getState().byAsociatie, ASOC);
    expect(after).toHaveLength(before + 1);
    expect(after[0].id).toBe(supplier.id);
  });

  it('preserves the demo suppliers after adding a new one', () => {
    addSupplierLive(ASOC, makeSupplier());
    const after = suppliersForAsociatie(useSuppliersStore.getState().byAsociatie, ASOC);
    const demoIds = DEMO_SUPPLIERS.map((s) => s.id);
    expect(after.filter((s) => demoIds.includes(s.id))).toHaveLength(DEMO_SUPPLIERS.length);
  });
});
