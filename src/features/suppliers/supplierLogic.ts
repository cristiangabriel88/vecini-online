import type { Supplier } from '@/shared/types/domain';
import { warrantyStatus, type WarrantyStatus } from '@/features/repairs/repairLogic';
import { DEMO_ASOCIATIE, DEMO_SUPPLIERS } from '@/shared/demo/demoData';
import { emptyArray } from '@/shared/lib/emptyArray';

/** Contract status reuses the warranty classifier: a contract end date is
 *  `active`, `expiring` (within 30 days) or `expired`; missing dates are `none`. */
export type ContractStatus = WarrantyStatus;

export function contractStatus(contractEnd: string | null, now: Date = new Date()): ContractStatus {
  return warrantyStatus(contractEnd, now);
}

/** A supplier needs a name and a kind. */
export function isValidSupplier(name: string, kind: string): boolean {
  return name.trim().length > 0 && kind.trim().length > 0;
}

/** Sort suppliers by contract end date ascending (soonest first); suppliers
 *  without an end date sort last. */
export function sortByContractEnd(suppliers: Supplier[]): Supplier[] {
  return [...suppliers].sort((a, b) => {
    if (!a.contract_end) return 1;
    if (!b.contract_end) return -1;
    return new Date(a.contract_end).getTime() - new Date(b.contract_end).getTime();
  });
}

/** Count suppliers whose contract is expired or expiring soon — used by the digest. */
export function countContractAlerts(suppliers: Supplier[], now: Date = new Date()): number {
  return suppliers.filter((s) => {
    const status = contractStatus(s.contract_end, now);
    return status === 'expired' || status === 'expiring';
  }).length;
}

// ── Per-asociatie supplier catalog ───────────────────────────────────────────

export type SuppliersByAsociatie = Record<string, Supplier[]>;

const EMPTY_SUPPLIERS = emptyArray<Supplier>();

export function suppliersForAsociatie(
  map: SuppliersByAsociatie,
  asociatieId: string | null,
): Supplier[] {
  if (!asociatieId) return EMPTY_SUPPLIERS;
  return map[asociatieId] ?? EMPTY_SUPPLIERS;
}

export function seedSuppliers(): SuppliersByAsociatie {
  return { [DEMO_ASOCIATIE.id]: [...DEMO_SUPPLIERS] };
}

export function addSupplierIn(
  map: SuppliersByAsociatie,
  asociatieId: string,
  supplier: Supplier,
): SuppliersByAsociatie {
  const current = map[asociatieId] ?? [];
  return { ...map, [asociatieId]: [supplier, ...current] };
}

export function migrateSuppliersState(persisted: unknown): SuppliersByAsociatie {
  const p = persisted as { byAsociatie?: SuppliersByAsociatie } | null;
  const existing = p?.byAsociatie ?? {};
  return { ...existing, [DEMO_ASOCIATIE.id]: [...DEMO_SUPPLIERS] };
}
