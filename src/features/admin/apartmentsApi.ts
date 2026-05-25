import type { Apartment } from '@/shared/types/domain';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { recordAudit } from '@/shared/store/auditStore';
import { apartmentShortLabel } from '@/features/apartment/apartmentLogic';
import { useApartmentsStore } from './apartmentsStore';

/* Dual-mode apartment repository. The zustand store is the synchronous source of
   truth the UI reads; these functions apply each change there and, when a backend
   is configured, mirror it to the `apartments` table (best-effort, never throwing
   to the caller, mirroring the audit store's strategy). Every mutation is also
   written to the tamper-evident audit log. */

/** The DB columns that map 1:1 onto the Apartment model. */
function toRow(a: Apartment): Record<string, unknown> {
  return {
    id: a.id,
    asociatie_id: a.asociatie_id,
    scara: a.scara,
    etaj: a.etaj,
    numar_apartament: a.numar_apartament,
    suprafata_utila: a.suprafata_utila,
    cota_parte_indiviza: a.cota_parte_indiviza,
    numar_persoane: a.numar_persoane,
    persons: a.persons,
    proprietar_principal_name: a.proprietar_principal_name,
    is_active: a.is_active,
    notes: a.notes,
  };
}

/** Hydrate the store for an asociație from the backend, when configured. The
 *  local (seeded/persisted) list stays authoritative if the read fails. */
export async function hydrateApartments(asociatieId: string): Promise<void> {
  if (!isSupabaseConfigured || !asociatieId) return;
  try {
    const { data, error } = await supabase
      .from('apartments')
      .select('*')
      .eq('asociatie_id', asociatieId);
    if (error || !data) return;
    useApartmentsStore.getState().replaceAll(asociatieId, data as Apartment[]);
  } catch {
    /* best-effort: the local list remains the source of truth for the UI */
  }
}

/** Create one or more apartments in an asociație. */
export function createApartments(asociatieId: string, apartments: Apartment[]): void {
  if (apartments.length === 0) return;
  useApartmentsStore.getState().addMany(asociatieId, apartments);
  recordAudit({
    action: 'apartment.created',
    entity: 'apartment',
    entity_label:
      apartments.length === 1
        ? apartmentShortLabel(apartments[0])
        : `${apartments.length}`,
    after: apartments.map((a) => apartmentShortLabel(a)).join(', '),
  });
  if (isSupabaseConfigured) {
    void (async () => {
      try {
        await supabase.from('apartments').insert(apartments.map(toRow));
      } catch {
        /* mirroring is best-effort */
      }
    })();
  }
}

/** Replace an existing apartment with its edited version. */
export function updateApartment(asociatieId: string, before: Apartment, after: Apartment): void {
  useApartmentsStore.getState().update(asociatieId, after);
  recordAudit({
    action: 'apartment.updated',
    entity: 'apartment',
    entity_label: apartmentShortLabel(after),
    before: before.proprietar_principal_name ?? '',
    after: after.proprietar_principal_name ?? '',
  });
  if (isSupabaseConfigured) {
    void (async () => {
      try {
        await supabase.from('apartments').update(toRow(after)).eq('id', after.id);
      } catch {
        /* mirroring is best-effort */
      }
    })();
  }
}

/** Delete an apartment from an asociație. */
export function deleteApartment(asociatieId: string, apartment: Apartment): void {
  useApartmentsStore.getState().remove(asociatieId, apartment.id);
  recordAudit({
    action: 'apartment.deleted',
    entity: 'apartment',
    entity_label: apartmentShortLabel(apartment),
    before: apartment.proprietar_principal_name ?? '',
  });
  if (isSupabaseConfigured) {
    void (async () => {
      try {
        await supabase.from('apartments').delete().eq('id', apartment.id);
      } catch {
        /* mirroring is best-effort */
      }
    })();
  }
}
