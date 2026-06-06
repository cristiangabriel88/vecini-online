import type { SkillOffering } from '@/shared/types/domain';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { reportError } from '@/shared/lib/errorReporting';
import { runHydration } from '@/shared/lib/runHydration';
import { useBarterStore } from './barterStore';

interface OfferingRow {
  id: string;
  asociatie_id: string;
  user_id: string | null;
  user_name: string | null;
  offers: string | null;
  needs: string | null;
}

function rowToOffering(row: OfferingRow): SkillOffering {
  return {
    id: row.id,
    asociatie_id: row.asociatie_id,
    user_id: row.user_id ?? '',
    user_name: row.user_name ?? '',
    offers: row.offers ?? '',
    needs: row.needs ?? '',
  };
}

export async function hydrateBarter(asociatieId: string): Promise<void> {
  return runHydration<OfferingRow, SkillOffering>(asociatieId, {
    query: () =>
      supabase
        .from('skill_offerings')
        .select('id,asociatie_id,user_id,user_name,offers,needs')
        .eq('asociatie_id', asociatieId),
    transform: rowToOffering,
    store: useBarterStore.getState(),
    source: 'barterApi.hydrate',
  });
}

export function saveOffering(asociatieId: string, offering: SkillOffering): void {
  useBarterStore.getState().upsertOffering(asociatieId, offering);
  if (!isSupabaseConfigured) return;
  void (async () => {
    try {
      await supabase.from('skill_offerings').upsert(
        {
          id: offering.id,
          asociatie_id: asociatieId,
          user_id: offering.user_id,
          user_name: offering.user_name,
          offers: offering.offers,
          needs: offering.needs,
        },
        { onConflict: 'asociatie_id,user_id' },
      );
    } catch (err) {
      reportError(err, { source: 'barterApi.save' });
    }
  })();
}

export function leaveOffering(asociatieId: string, userId: string): void {
  useBarterStore.getState().removeOffering(asociatieId, userId);
  if (!isSupabaseConfigured) return;
  void (async () => {
    try {
      await supabase
        .from('skill_offerings')
        .delete()
        .eq('asociatie_id', asociatieId)
        .eq('user_id', userId);
    } catch (err) {
      reportError(err, { source: 'barterApi.leave' });
    }
  })();
}
