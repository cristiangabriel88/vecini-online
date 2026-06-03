import type { Apartment } from '@/shared/types/domain';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { recordAudit } from '@/shared/store/auditStore';
import { apartmentShortLabel } from '@/features/apartment/apartmentLogic';
import { useApartmentsStore } from './apartmentsStore';

/* Dual-mode apartment repository. The zustand store is the synchronous source of
   truth the UI reads; these functions apply each change there and, when a backend
   is configured, mirror it to the `apartments` table. A failed live write calls the
   optional `onError` callback so the caller can surface a user-visible toast. Every
   mutation is also written to the tamper-evident audit log. */

/**
 * Discriminated error type surfaced to callers on a live write failure.
 * - 'conflict': the (asociatie_id, scara, numar_apartament) unique constraint was
 *   violated -- the admin is trying to create a duplicate apartment.
 * - 'write-failed': any other DB/network error.
 */
export type ApartmentWriteError = 'conflict' | 'write-failed';

/**
 * Map a Supabase error to the ApartmentWriteError discriminant.
 * Postgres unique-constraint violations surface as error code '23505'.
 */
function classify(err: { code?: string }): ApartmentWriteError {
  return err.code === '23505' ? 'conflict' : 'write-failed';
}

/**
 * The DB columns that map 1:1 onto the Apartment model.
 * Local apartment ids use an 'ap-' prefix for visual distinction in the offline
 * store; the 'apartments' table expects a plain UUID, so the prefix is stripped
 * here before any Supabase call.
 */
export function toRow(a: Apartment): Record<string, unknown> {
  const dbId = a.id.startsWith('ap-') ? a.id.slice(3) : a.id;
  return {
    id: dbId,
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

/**
 * Strip the 'ap-' prefix from a local apartment id to get the DB-compatible UUID.
 * Used in WHERE clauses and in the invite apartment_id FK reference.
 */
export function toDbId(localId: string): string {
  return localId.startsWith('ap-') ? localId.slice(3) : localId;
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

/**
 * Create one or more apartments in an asociație.
 * With a backend configured, wait for the Supabase write before updating the
 * local store so route hydration cannot overwrite a pending optimistic item.
 * A failed live write calls onError with a discriminated error code so the
 * caller can surface a bilingual toast without silent data-loss.
 */
export async function createApartments(
  asociatieId: string,
  apartments: Apartment[],
  onError?: (err: ApartmentWriteError) => void,
): Promise<boolean> {
  if (apartments.length === 0) return true;
  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.from('apartments').insert(apartments.map(toRow));
      if (error) {
        onError?.(classify(error));
        return false;
      }
    } catch {
      onError?.('write-failed');
      return false;
    }
  }
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
  return true;
}

/**
 * Replace an existing apartment with its edited version.
 * Surfaces a live write failure via onError (same discriminant as createApartments).
 */
export async function updateApartment(
  asociatieId: string,
  before: Apartment,
  after: Apartment,
  onError?: (err: ApartmentWriteError) => void,
): Promise<boolean> {
  if (isSupabaseConfigured) {
    try {
      const dbId = toDbId(after.id);
      const { error } = await supabase
        .from('apartments')
        .update(toRow(after))
        .eq('id', dbId);
      if (error) {
        onError?.(classify(error));
        return false;
      }
    } catch {
      onError?.('write-failed');
      return false;
    }
  }
  useApartmentsStore.getState().update(asociatieId, after);
  recordAudit({
    action: 'apartment.updated',
    entity: 'apartment',
    entity_label: apartmentShortLabel(after),
    before: before.proprietar_principal_name ?? '',
    after: after.proprietar_principal_name ?? '',
  });
  return true;
}

/**
 * Delete an apartment from an asociație.
 * Surfaces a live write failure via onError.
 */
export function deleteApartment(
  asociatieId: string,
  apartment: Apartment,
  onError?: (err: ApartmentWriteError) => void,
): void {
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
        const dbId = toDbId(apartment.id);
        const { error } = await supabase.from('apartments').delete().eq('id', dbId);
        if (error) onError?.(classify(error));
      } catch {
        onError?.('write-failed');
      }
    })();
  }
}
