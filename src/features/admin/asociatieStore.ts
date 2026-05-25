import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Asociatie } from '@/shared/types/domain';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { DEMO_ASOCIATIE } from '@/shared/demo/demoData';
import { recordAudit } from '@/shared/store/auditStore';
import { useAuthStore } from '@/shared/store/authStore';

/* Editable building/association profile. The asociație is otherwise stored only
   as a minimal { id, name } in the auth store (offline) or fetched read-only from
   Supabase. This store keeps the admin's profile edits keyed by asociație id,
   seeded from the demo asociație, and mirrors them to the `asociatii` table when a
   backend is configured. */

/** The admin-editable subset of an asociație profile. */
export type AsociatieProfilePatch = Partial<
  Pick<Asociatie, 'name' | 'address' | 'cui' | 'registration_number' | 'settings'>
>;

type ProfileById = Record<string, AsociatieProfilePatch>;

interface AsociatieState {
  /** Profile edits per asociație id, merged onto the base record by selectors. */
  edits: ProfileById;
  update: (asociatieId: string, patch: AsociatieProfilePatch) => void;
}

export const useAsociatieStore = create<AsociatieState>()(
  persist(
    (set) => ({
      edits: {},
      update: (asociatieId, patch) =>
        set((s) => {
          const next = { ...(s.edits[asociatieId] ?? {}), ...patch };
          if (isSupabaseConfigured) {
            void (async () => {
              try {
                await supabase.from('asociatii').update(patch).eq('id', asociatieId);
              } catch {
                /* mirroring is best-effort; the local profile drives the UI */
              }
            })();
          }
          recordAudit({
            action: 'building.updated',
            entity: 'building',
            entity_label: next.name ?? asociatieId,
          });
          return { edits: { ...s.edits, [asociatieId]: next } };
        }),
    }),
    { name: 'vecini.asociatie', version: 1 },
  ),
);

/** Build the base profile for an asociație: the demo record for the demo tenant,
 *  otherwise a minimal record carrying the locally-created name. */
function baseAsociatie(asociatieId: string, localName: string | undefined): Asociatie {
  if (asociatieId === DEMO_ASOCIATIE.id) return DEMO_ASOCIATIE;
  const now = new Date().toISOString();
  return {
    id: asociatieId,
    name: localName ?? '',
    slug: '',
    address: '',
    cui: null,
    registration_number: null,
    country: 'RO',
    locale: 'ro',
    timezone: 'Europe/Bucharest',
    currency: 'RON',
    branding: {},
    settings: {},
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };
}

/** Hook: the active asociație profile (base merged with the admin's edits). */
export function useCurrentAsociatie(): Asociatie | null {
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  const localName = useAuthStore(
    (s) => s.localAsociatii.find((a) => a.id === asociatieId)?.name,
  );
  const patch = useAsociatieStore((s) => (asociatieId ? s.edits[asociatieId] : undefined));
  if (!asociatieId) return null;
  const base = baseAsociatie(asociatieId, localName);
  return patch ? { ...base, ...patch } : base;
}
