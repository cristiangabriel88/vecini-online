/**
 * Builds "data" knowledge-base entries from user-visible app data so the
 * assistant can answer concrete lookups like "numărul de telefon al
 * președintelui" by surfacing the actual value, not just a page link.
 *
 * Only data a regular resident is allowed to see is included:
 *  - Emergency contacts (F56) -- public to everyone (includes the administrator
 *    and the committee president, with their phone numbers).
 *  - Resident directory (F36) -- opt-in; each field is masked through the same
 *    `visibleEntry` consent filter the directory page uses, so a number the
 *    owner did not choose to share never becomes an answer.
 *
 * Phase 1 (demo): data sourced from demo fixtures.
 * Phase 2 (live): `useDataEntries()` hook reads from real per-asociatie stores
 *   (emergency contacts hydrated from Supabase; directory from the reactive
 *   `directoryStore` which holds live or demo entries). Gate: `isSupabaseConfigured`.
 */
import { useState, useEffect, useMemo } from 'react';
import { DEMO_EMERGENCY, DEMO_DIRECTORY } from '@/shared/demo/demoData';
import { isListed, visibleEntry } from '@/features/directory/directoryLogic';
import { useAsociatieDirectory } from '@/features/directory/directoryStore';
import { useAuthStore } from '@/shared/store/authStore';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { normalize } from './match';
import type { KbEntry } from './knowledge';
import type { EmergencyContact, DirectoryEntry } from '@/shared/types/domain';

/** Generic intent words that should pull a contact answer to the top. */
const PHONE_TERMS = ['telefon', 'numar', 'phone', 'number', 'contact', 'suna', 'sunat', 'apel', 'call'];
const EMAIL_TERMS = ['email', 'mail', 'adresa', 'contact'];

/** Extra RO/EN words per emergency-contact category, beyond the label itself. */
const CATEGORY_TERMS: Record<string, string[]> = {
  admin: ['administrator', 'admin', 'manager'],
  comitet: ['presedinte', 'president', 'comitet', 'committee'],
  lift: ['lift', 'elevator'],
  apa: ['apa', 'water'],
  gaz: ['gaz', 'gas'],
  general: ['urgenta', 'emergency', '112', 'salvare', 'pompieri', 'politie'],
};

/** Split a human label into plain matchable words. */
function words(text: string | null | undefined): string[] {
  if (!text) return [];
  return normalize(text).split(' ').filter((w) => w.length >= 2);
}

/** Build KbEntries from an emergency contacts list (demo or live). */
export function buildEmergencyEntries(contacts: EmergencyContact[]): KbEntry[] {
  return contacts.map((c): KbEntry => ({
    id: `data.emergency.${c.id}`,
    kind: 'data',
    featureKey: 'F56',
    audience: ['all'],
    route: '/app/urgenta',
    data: {
      terms: [...words(c.label), ...(CATEGORY_TERMS[c.category] ?? []), ...PHONE_TERMS],
      label: c.label,
      value: c.phone,
      valueKind: 'phone',
    },
  }));
}

/** Build KbEntries from a directory entry list, applying per-field consent masks. */
export function buildDirectoryEntries(entries: DirectoryEntry[]): KbEntry[] {
  const result: KbEntry[] = [];
  for (const raw of entries) {
    if (!isListed(raw)) continue;
    const v = visibleEntry(raw);
    const base = [...words(v.name), ...words(v.apartment)];
    if (v.phone) {
      result.push({
        id: `data.dir.phone.${v.id}`,
        kind: 'data',
        featureKey: 'F36',
        audience: ['all'],
        route: '/app/vecini',
        data: { terms: [...base, ...PHONE_TERMS], label: v.name ?? v.apartment ?? 'Vecin', value: v.phone, valueKind: 'phone' },
      });
    }
    if (v.email) {
      result.push({
        id: `data.dir.email.${v.id}`,
        kind: 'data',
        featureKey: 'F36',
        audience: ['all'],
        route: '/app/vecini',
        data: { terms: [...base, ...EMAIL_TERMS], label: v.name ?? v.apartment ?? 'Vecin', value: v.email, valueKind: 'email' },
      });
    }
  }
  return result;
}

/**
 * Hook: returns emergency contacts for the active asociatie.
 * Demo path: returns DEMO_EMERGENCY.
 * Live path: queries `emergency_contacts` under RLS when Supabase is configured.
 */
export function useAsociatieEmergencyContacts(): EmergencyContact[] {
  const [contacts, setContacts] = useState<EmergencyContact[]>(DEMO_EMERGENCY);
  const currentAsociatieId = useAuthStore((s) => s.currentAsociatieId);

  useEffect(() => {
    if (!isSupabaseConfigured || !currentAsociatieId) return;
    void supabase
      .from('emergency_contacts')
      .select('id, asociatie_id, label, phone, category, sort_order')
      .eq('asociatie_id', currentAsociatieId)
      .order('sort_order')
      .then(({ data }) => {
        if (data && data.length > 0) setContacts(data as EmergencyContact[]);
      });
  }, [currentAsociatieId]);

  return contacts;
}

/**
 * Hook: reactive KbEntries built from the real per-asociatie stores.
 * Emergency contacts hydrated from Supabase when live; directory from the
 * reactive directoryStore (holds demo or live entries depending on hydration).
 */
export function useDataEntries(): KbEntry[] {
  const emergencyContacts = useAsociatieEmergencyContacts();
  const directoryEntries = useAsociatieDirectory();
  return useMemo(
    () => [...buildEmergencyEntries(emergencyContacts), ...buildDirectoryEntries(directoryEntries)],
    [emergencyContacts, directoryEntries],
  );
}

/** Static demo-backed entries for tests and backwards-compat imports. */
export const DATA_ENTRIES: KbEntry[] = [
  ...buildEmergencyEntries(DEMO_EMERGENCY),
  ...buildDirectoryEntries(DEMO_DIRECTORY),
];
