import type { DirectoryEntry } from '@/shared/types/domain';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { reportError } from '@/shared/lib/errorReporting';
import { useDirectoryStore } from './directoryStore';

type ConsentField = 'show_name' | 'show_apartment' | 'show_phone' | 'show_email';

interface ConsentRow {
  id: string;
  asociatie_id: string;
  user_id: string;
  show_name: boolean;
  show_apartment: boolean;
  show_phone: boolean;
  show_email: boolean;
  name: string | null;
  apartment: string | null;
  phone: string | null;
  email: string | null;
}

function rowToEntry(row: ConsentRow): DirectoryEntry {
  return {
    id: row.id,
    asociatie_id: row.asociatie_id,
    user_id: row.user_id,
    name: row.name ?? '',
    apartment: row.apartment ?? '',
    phone: row.phone ?? '',
    email: row.email ?? '',
    show_name: row.show_name,
    show_apartment: row.show_apartment,
    show_phone: row.show_phone,
    show_email: row.show_email,
  };
}

/**
 * Hydrate the directory for one asociatie: reads all `resident_directory_consent`
 * rows (including the denormalized profile columns added in T216 migration).
 * No-op when the backend is absent or the id is empty.
 */
export async function hydrateDirectory(asociatieId: string): Promise<void> {
  if (!isSupabaseConfigured || !asociatieId) return;
  const store = useDirectoryStore.getState();
  try {
    const { data, error } = await supabase
      .from('resident_directory_consent')
      .select(
        'id, asociatie_id, user_id, show_name, show_apartment, show_phone, show_email, name, apartment, phone, email',
      )
      .eq('asociatie_id', asociatieId);
    if (error || !data) {
      reportError(error ?? new Error('no data'), { source: 'directoryApi.hydrate' });
      store.setFetchError('load');
      return;
    }
    store.setFetchError(null);
    store.replaceForAsociatie(asociatieId, (data as ConsentRow[]).map(rowToEntry));
  } catch (err) {
    reportError(err, { source: 'directoryApi.hydrate' });
    store.setFetchError('load');
  }
}

/**
 * Upsert the current user's directory consent entry. Called on first visit and
 * on each toggle. `entry` contains both the current consent flags and the
 * denormalized profile snapshot (name/apartment/phone/email).
 */
export async function syncDirectoryConsent(
  asociatieId: string,
  userId: string,
  entry: Pick<DirectoryEntry, 'show_name' | 'show_apartment' | 'show_phone' | 'show_email' | 'name' | 'apartment' | 'phone' | 'email'>,
  field?: ConsentField,
): Promise<void> {
  if (!isSupabaseConfigured || !userId) return;
  const payload = {
    asociatie_id: asociatieId,
    user_id: userId,
    show_name: field === 'show_name' ? !entry.show_name : entry.show_name,
    show_apartment: field === 'show_apartment' ? !entry.show_apartment : entry.show_apartment,
    show_phone: field === 'show_phone' ? !entry.show_phone : entry.show_phone,
    show_email: field === 'show_email' ? !entry.show_email : entry.show_email,
    name: entry.name,
    apartment: entry.apartment,
    phone: entry.phone,
    email: entry.email,
  };
  try {
    await supabase
      .from('resident_directory_consent')
      .upsert(payload, { onConflict: 'user_id,asociatie_id' });
  } catch (err) {
    reportError(err, { source: 'directoryApi.syncConsent' });
  }
}
