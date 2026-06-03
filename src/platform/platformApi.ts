import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { reportError } from '@/shared/lib/errorReporting';
import { type PlatformAsociatieSummary } from './demoPlatform';
import { usePlatformAsociatiiStore } from './platformAsociatiiStore';

type RowWithAsoc = { asociatie_id: string };
type SignInRow = { asociatie_id: string | null; created_at: string };

function groupCount(rows: RowWithAsoc[]): Record<string, number> {
  return rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.asociatie_id] = (acc[r.asociatie_id] ?? 0) + 1;
    return acc;
  }, {});
}

function groupLatest(rows: SignInRow[]): Record<string, string> {
  return rows.reduce<Record<string, string>>((acc, r) => {
    if (!r.asociatie_id) return acc;
    if (!acc[r.asociatie_id] || r.created_at > acc[r.asociatie_id]) {
      acc[r.asociatie_id] = r.created_at;
    }
    return acc;
  }, {});
}

/**
 * Load the full platform asociatii list (T120) using the super_admin cross-tenant
 * RLS policies. Fetches asociatii, member counts, apartment counts, and last
 * sign-in per asociatie. Updates the platform store on success.
 * No-op when Supabase is not configured (demo/offline mode).
 */
export async function hydrateAsociatiiList(): Promise<void> {
  if (!isSupabaseConfigured) return;

  usePlatformAsociatiiStore.getState().setFetchError(null);

  try {
    const [
      { data: asocRows, error: asocErr },
      { data: memberRows },
      { data: aptRows },
      { data: signInRows },
    ] = await Promise.all([
      supabase
        .from('asociatii')
        .select('id, name, address, cui, iban, contact_phone, contact_email')
        .is('deleted_at', null)
        .order('name'),
      supabase
        .from('memberships')
        .select('asociatie_id')
        .is('ended_at', null)
        .neq('role', 'super_admin'),
      supabase
        .from('apartments')
        .select('asociatie_id')
        .eq('is_active', true),
      supabase
        .from('auth_audit_events')
        .select('asociatie_id, created_at')
        .eq('event_type', 'sign_in')
        .order('created_at', { ascending: false })
        .limit(500),
    ]);

    if (asocErr) {
      usePlatformAsociatiiStore.getState().setFetchError('load');
      reportError(new Error(asocErr.message), { source: 'platformApi.hydrateAsociatiiList' });
      return;
    }

    const memberCounts = groupCount((memberRows ?? []) as RowWithAsoc[]);
    const aptCounts = groupCount((aptRows ?? []) as RowWithAsoc[]);
    const lastSignIn = groupLatest((signInRows ?? []) as SignInRow[]);

    const rows: PlatformAsociatieSummary[] = (asocRows ?? []).map((a) => ({
      id: a.id as string,
      name: a.name as string,
      city: '',
      members: memberCounts[a.id as string] ?? 0,
      apartments: aptCounts[a.id as string] ?? 0,
      lastAdminSignInAt: lastSignIn[a.id as string] ?? null,
      address: (a.address as string | null) ?? undefined,
      cui: (a.cui as string | null) ?? undefined,
      iban: (a.iban as string | null) ?? undefined,
      contactPhone: (a.contact_phone as string | null) ?? undefined,
      contactEmail: (a.contact_email as string | null) ?? undefined,
    }));

    usePlatformAsociatiiStore.getState().replaceAsociatii(rows);
  } catch (err) {
    usePlatformAsociatiiStore.getState().setFetchError('load');
    reportError(err instanceof Error ? err : new Error(String(err)), {
      source: 'platformApi.hydrateAsociatiiList',
    });
  }
}
