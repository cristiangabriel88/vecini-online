import type { BirthdayConsent } from '@/shared/types/domain';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { reportError } from '@/shared/lib/errorReporting';
import { useBirthdaysStore } from './birthdaysStore';

interface BirthdayRow {
  id: string;
  asociatie_id: string;
  user_id: string | null;
  user_name: string | null;
  birth_day: number | null;
  birth_month: number | null;
}

function rowToConsent(row: BirthdayRow): BirthdayConsent {
  return {
    id: row.id,
    asociatie_id: row.asociatie_id,
    user_id: row.user_id ?? '',
    user_name: row.user_name ?? '',
    birth_day: row.birth_day ?? 1,
    birth_month: row.birth_month ?? 1,
  };
}

export async function hydrateBirthdays(asociatieId: string): Promise<void> {
  if (!isSupabaseConfigured || !asociatieId) return;
  const store = useBirthdaysStore.getState();
  try {
    const { data, error } = await supabase
      .from('birthdays_consent')
      .select('id,asociatie_id,user_id,user_name,birth_day,birth_month')
      .eq('asociatie_id', asociatieId);
    if (error || !data) {
      reportError(error ?? new Error('no data'), { source: 'birthdaysApi.hydrate' });
      store.setFetchError('load');
      return;
    }
    store.setFetchError(null);
    store.replaceForAsociatie(asociatieId, (data as BirthdayRow[]).map(rowToConsent));
  } catch (err) {
    reportError(err, { source: 'birthdaysApi.hydrate' });
    store.setFetchError('load');
  }
}

export function saveBirthdayConsent(asociatieId: string, consent: BirthdayConsent): void {
  useBirthdaysStore.getState().upsertConsent(asociatieId, consent);
  if (!isSupabaseConfigured) return;
  void (async () => {
    try {
      await supabase.from('birthdays_consent').upsert(
        {
          id: consent.id,
          asociatie_id: asociatieId,
          user_id: consent.user_id,
          user_name: consent.user_name,
          birth_day: consent.birth_day,
          birth_month: consent.birth_month,
        },
        { onConflict: 'asociatie_id,user_id' },
      );
    } catch (err) {
      reportError(err, { source: 'birthdaysApi.save' });
    }
  })();
}

export function leaveBirthdayConsent(asociatieId: string, userId: string): void {
  useBirthdaysStore.getState().removeConsent(asociatieId, userId);
  if (!isSupabaseConfigured) return;
  void (async () => {
    try {
      await supabase
        .from('birthdays_consent')
        .delete()
        .eq('asociatie_id', asociatieId)
        .eq('user_id', userId);
    } catch (err) {
      reportError(err, { source: 'birthdaysApi.leave' });
    }
  })();
}
