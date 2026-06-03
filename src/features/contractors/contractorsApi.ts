import type { Contractor } from '@/shared/types/domain';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { reportError } from '@/shared/lib/errorReporting';
import { useContractorStore } from './contractorStore';

interface ContractorRow {
  id: string;
  asociatie_id: string;
  name: string | null;
  specialty: string | null;
  price_tier: string | null;
  contact: string | null;
  last_used: string | null;
  available: boolean | null;
}

interface RatingRow {
  contractor_id: string;
  rating: number | null;
}

function buildContractor(row: ContractorRow, ratings: RatingRow[]): Contractor {
  const mine = ratings.filter((r) => r.contractor_id === row.id && r.rating !== null);
  const count = mine.length;
  const avg = count > 0 ? mine.reduce((sum, r) => sum + (r.rating ?? 0), 0) / count : 0;
  return {
    id: row.id,
    asociatie_id: row.asociatie_id,
    name: row.name ?? '',
    specialty: row.specialty ?? '',
    price_tier: row.price_tier ?? 'mediu',
    contact: row.contact ?? '',
    last_used: row.last_used,
    available: row.available ?? true,
    rating: Math.round(avg * 10) / 10,
    rating_count: count,
  };
}

export async function hydrateContractors(asociatieId: string): Promise<void> {
  if (!isSupabaseConfigured || !asociatieId) return;
  const store = useContractorStore.getState();
  try {
    const [contractorsRes, ratingsRes] = await Promise.all([
      supabase
        .from('contractors')
        .select('id, asociatie_id, name, specialty, price_tier, contact, last_used, available')
        .eq('asociatie_id', asociatieId)
        .order('name', { ascending: true }),
      supabase
        .from('contractor_ratings')
        .select('contractor_id, rating')
        .eq('asociatie_id', asociatieId),
    ]);
    if (contractorsRes.error || !contractorsRes.data) {
      reportError(contractorsRes.error ?? new Error('no data'), {
        source: 'contractorsApi.hydrate',
      });
      store.setFetchError('load');
      return;
    }
    store.setFetchError(null);
    const ratings = (ratingsRes.data ?? []) as RatingRow[];
    store.replaceForAsociatie(
      asociatieId,
      (contractorsRes.data as ContractorRow[]).map((row) => buildContractor(row, ratings)),
    );
  } catch (err) {
    reportError(err, { source: 'contractorsApi.hydrate' });
    store.setFetchError('load');
  }
}

export function addContractorLive(asociatieId: string, contractor: Contractor): void {
  useContractorStore.getState().addContractor(asociatieId, contractor);
  if (!isSupabaseConfigured) return;
  void (async () => {
    try {
      await supabase.from('contractors').insert({
        id: contractor.id,
        asociatie_id: asociatieId,
        name: contractor.name,
        specialty: contractor.specialty,
        price_tier: contractor.price_tier,
        contact: contractor.contact || null,
        last_used: contractor.last_used,
        available: contractor.available,
      });
    } catch (err) {
      reportError(err, { source: 'contractorsApi.add' });
    }
  })();
}

export function rateContractorLive(
  asociatieId: string,
  contractorId: string,
  raterUserId: string,
  value: number,
): void {
  useContractorStore.getState().rateContractor(asociatieId, contractorId, value);
  if (!isSupabaseConfigured) return;
  void (async () => {
    try {
      await supabase.from('contractor_ratings').insert({
        asociatie_id: asociatieId,
        contractor_id: contractorId,
        rater_user_id: raterUserId,
        rating: value,
      });
    } catch (err) {
      reportError(err, { source: 'contractorsApi.rate' });
    }
  })();
}

export function toggleContractorAvailableLive(
  asociatieId: string,
  contractorId: string,
  newAvailable: boolean,
): void {
  useContractorStore.getState().toggleAvailable(asociatieId, contractorId);
  if (!isSupabaseConfigured) return;
  void (async () => {
    try {
      await supabase
        .from('contractors')
        .update({ available: newAvailable })
        .eq('id', contractorId)
        .eq('asociatie_id', asociatieId);
    } catch (err) {
      reportError(err, { source: 'contractorsApi.toggle' });
    }
  })();
}
