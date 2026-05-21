import { create } from 'zustand';
import type { Supplier } from '@/shared/types/domain';
import { DEMO_SUPPLIERS } from '@/shared/demo/demoData';

interface NewSupplier {
  name: string;
  kind: string;
  contact: string;
  contract_end: string;
}

interface SuppliersState {
  suppliers: Supplier[];
  add: (input: NewSupplier) => void;
}

export const useSuppliersStore = create<SuppliersState>((set) => ({
  suppliers: [...DEMO_SUPPLIERS],
  add: ({ name, kind, contact, contract_end }) =>
    set((s) => ({
      suppliers: [
        {
          id: `sup-${Date.now()}`,
          asociatie_id: 'demo-asoc',
          name: name.trim(),
          kind: kind.trim(),
          contact: contact.trim() || null,
          account_number: null,
          contract_start: null,
          contract_end: contract_end || null,
          last_invoice_date: null,
        },
        ...s.suppliers,
      ],
    })),
}));
