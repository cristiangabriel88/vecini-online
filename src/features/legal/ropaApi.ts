import { isSupabaseConfigured, supabase } from '@/shared/lib/supabase';
import type { ProcessingActivity } from './ropaLogic';

/**
 * Point-in-time ROPA snapshot row (art. 30 accountability record).
 */
export interface RopaSnapshot {
  id: string;
  asociatie_id: string;
  generated_at: string;
  generated_by_name: string;
  enabled_keys: string[];
  activities: ProcessingActivity[];
}

/**
 * DPA adoption record: the controller formally acknowledges the art. 28 template.
 */
export interface DpaAdoption {
  id: string;
  asociatie_id: string;
  version: string;
  adopted_at: string;
  adopted_by_name: string;
  adopted_by_user_id: string | null;
}

/**
 * Persist a point-in-time ROPA snapshot for the asociatie (behind
 * isSupabaseConfigured). No-op offline — the generated view in
 * ProcessingRecordsPage is always available without a backend.
 */
export async function saveRopaSnapshot(
  asociatieId: string,
  actorName: string,
  enabledKeys: string[],
  activities: ProcessingActivity[],
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured || !asociatieId) return { ok: false, error: 'not-configured' };
  try {
    const { error } = await supabase.from('ropa_snapshots').insert({
      asociatie_id: asociatieId,
      generated_by_name: actorName,
      enabled_keys: enabledKeys,
      activities: activities as unknown as Record<string, unknown>[],
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch {
    return { ok: false, error: 'network-error' };
  }
}

/**
 * Load the most recent ROPA snapshots for this asociatie (newest first, max 10).
 * Returns [] offline.
 */
export async function loadRopaSnapshots(asociatieId: string): Promise<RopaSnapshot[]> {
  if (!isSupabaseConfigured || !asociatieId) return [];
  try {
    const { data } = await supabase
      .from('ropa_snapshots')
      .select('id, asociatie_id, generated_at, generated_by_name, enabled_keys, activities')
      .eq('asociatie_id', asociatieId)
      .order('generated_at', { ascending: false })
      .limit(10);
    return (data ?? []) as RopaSnapshot[];
  } catch {
    return [];
  }
}

/**
 * Record the controller formally adopting the current DPA template version.
 * No-op offline.
 */
export async function adoptDpa(
  asociatieId: string,
  version: string,
  actorName: string,
  actorUserId: string | null,
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured || !asociatieId) return { ok: false, error: 'not-configured' };
  try {
    const { error } = await supabase.from('dpa_adoptions').insert({
      asociatie_id: asociatieId,
      version,
      adopted_by_name: actorName,
      adopted_by_user_id: actorUserId ?? null,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch {
    return { ok: false, error: 'network-error' };
  }
}

/**
 * Load the DPA adoption history for this asociatie (newest first, max 10).
 * Returns [] offline.
 */
export async function loadDpaAdoptions(asociatieId: string): Promise<DpaAdoption[]> {
  if (!isSupabaseConfigured || !asociatieId) return [];
  try {
    const { data } = await supabase
      .from('dpa_adoptions')
      .select('id, asociatie_id, version, adopted_at, adopted_by_name, adopted_by_user_id')
      .eq('asociatie_id', asociatieId)
      .order('adopted_at', { ascending: false })
      .limit(10);
    return (data ?? []) as DpaAdoption[];
  } catch {
    return [];
  }
}
