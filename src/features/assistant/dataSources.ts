/**
 * Builds "data" knowledge-base entries from user-visible app data so the
 * assistant can answer concrete lookups like "numărul de telefon al
 * președintelui" by surfacing the actual value, not just a page link.
 *
 * Only data a regular resident is allowed to see is included:
 *  - Emergency contacts (F56) — public to everyone (includes the administrator
 *    and the committee president, with their phone numbers).
 *  - Resident directory (F36) — opt-in; each field is masked through the same
 *    `visibleEntry` consent filter the directory page uses, so a number the
 *    owner did not choose to share never becomes an answer.
 *
 * The app currently runs on demo data, so these are sourced from the demo
 * fixtures (the same ones the pages render). When a live backend is wired, this
 * is the single place that swaps to Supabase queries under RLS (Phase 2).
 */
import { DEMO_EMERGENCY, DEMO_DIRECTORY } from '@/shared/demo/demoData';
import { isListed, visibleEntry } from '@/features/directory/directoryLogic';
import { normalize } from './match';
import type { KbEntry } from './knowledge';

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

function buildEmergencyEntries(): KbEntry[] {
  return DEMO_EMERGENCY.map((c): KbEntry => ({
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

function buildDirectoryEntries(): KbEntry[] {
  const entries: KbEntry[] = [];
  for (const raw of DEMO_DIRECTORY) {
    if (!isListed(raw)) continue;
    const v = visibleEntry(raw); // applies the resident's per-field consent
    const base = [...words(v.name), ...words(v.apartment)];
    if (v.phone) {
      entries.push({
        id: `data.dir.phone.${v.id}`,
        kind: 'data',
        featureKey: 'F36',
        audience: ['all'],
        route: '/app/vecini',
        data: { terms: [...base, ...PHONE_TERMS], label: v.name ?? v.apartment ?? 'Vecin', value: v.phone, valueKind: 'phone' },
      });
    }
    if (v.email) {
      entries.push({
        id: `data.dir.email.${v.id}`,
        kind: 'data',
        featureKey: 'F36',
        audience: ['all'],
        route: '/app/vecini',
        data: { terms: [...base, ...EMAIL_TERMS], label: v.name ?? v.apartment ?? 'Vecin', value: v.email, valueKind: 'email' },
      });
    }
  }
  return entries;
}

/** All data entries (demo-backed). Static for now; swap to live queries later. */
export const DATA_ENTRIES: KbEntry[] = [...buildEmergencyEntries(), ...buildDirectoryEntries()];
