import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { reportError } from '@/shared/lib/errorReporting';
import { useAsociatieStore, type AsociatieProfilePatch } from './asociatieStore';
import { validateBuildingIdentity, type BuildingIdentityForm } from './buildingLogic';

/* Dual-mode asociație identity repository (T200). The Zustand store is the
   synchronous source of truth the UI reads; these functions sync with the
   `asociatii` table when a backend is configured. The demo/offline store stays
   the default when Supabase is absent. */

/** Discriminated error returned by saveAsociatie on a live write failure. */
export type AsociatieSaveError = 'conflict' | 'write-failed';

/**
 * Load the active asociație's identity fields from the DB into the local store.
 * No-op when Supabase is not configured or the id is empty.
 * On error, silently retains the local state.
 */
export async function hydrateAsociatie(asociatieId: string): Promise<void> {
  if (!isSupabaseConfigured || !asociatieId) return;
  try {
    const { data, error } = await supabase
      .from('asociatii')
      .select(
        'name, address, cui, registration_number, iban, contact_phone, contact_email, settings',
      )
      .eq('id', asociatieId)
      .maybeSingle();
    if (error) {
      reportError(new Error(error.message), { source: 'asociatieApi.hydrate' });
      return;
    }
    if (!data) return;
    const patch: AsociatieProfilePatch = {};
    if (data.name != null) patch.name = data.name;
    if (data.address != null) patch.address = data.address;
    if (data.cui != null) patch.cui = data.cui;
    if (data.registration_number != null) patch.registration_number = data.registration_number;
    if (data.iban != null) patch.iban = data.iban;
    if (data.contact_phone != null) patch.contact_phone = data.contact_phone;
    if (data.contact_email != null) patch.contact_email = data.contact_email;
    if (data.settings != null) patch.settings = data.settings;
    useAsociatieStore.getState().hydrateFromRemote(asociatieId, patch);
  } catch (err) {
    reportError(err instanceof Error ? err : new Error(String(err)), {
      source: 'asociatieApi.hydrate',
    });
  }
}

/**
 * Save the asociație identity to the local store and, when a backend is
 * configured, to the `asociatii` table. Validates the identity fields before the
 * live write using validateBuildingIdentity. Returns null on success, 'conflict'
 * when another row already holds the same CUI, or 'write-failed' on any other
 * DB error. The local store is always updated synchronously regardless of the
 * live result.
 */
export async function saveAsociatie(
  asociatieId: string,
  patch: AsociatieProfilePatch,
): Promise<AsociatieSaveError | null> {
  useAsociatieStore.getState().update(asociatieId, patch);
  if (!isSupabaseConfigured || !asociatieId) return null;

  const form: BuildingIdentityForm = {
    name: patch.name ?? '',
    address: patch.address ?? '',
    cui: patch.cui ?? '',
    registration_number: patch.registration_number ?? '',
    iban: patch.iban ?? '',
    contact_phone: patch.contact_phone ?? '',
    contact_email: patch.contact_email ?? '',
  };
  const { value: validated } = validateBuildingIdentity(form);
  if (!validated) return 'write-failed';

  try {
    const { error } = await supabase
      .from('asociatii')
      .update({
        name: validated.name,
        address: validated.address,
        cui: validated.cui || null,
        registration_number: validated.registration_number || null,
        iban: validated.iban || null,
        contact_phone: validated.contact_phone || null,
        contact_email: validated.contact_email || null,
        settings: patch.settings,
      })
      .eq('id', asociatieId);
    if (error) {
      reportError(new Error(error.message), { source: 'asociatieApi.save' });
      return error.code === '23505' ? 'conflict' : 'write-failed';
    }
    return null;
  } catch (err) {
    reportError(err instanceof Error ? err : new Error(String(err)), {
      source: 'asociatieApi.save',
    });
    return 'write-failed';
  }
}
