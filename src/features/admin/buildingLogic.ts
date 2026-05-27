/* Pure helpers for the building's entrances (scări). Entrances are configured as
   an interval the admin picks by its first and last value, in one of two modes:
   capital letters (A, B, C ...) or numbers (1, 2, 3 ...). The generated list is
   stored in the flexible `Asociatie.settings.scari` bag and drives the entrance
   selector on the apartment forms. No UI or store imports so it stays testable. */

import { isValidCui, isValidEmail, isValidIban, isValidPhone, normalizeIban } from '@/shared/lib/identity';

export type EntranceMode = 'letters' | 'numbers';

/** A, B, ... Z. */
export const ENTRANCE_LETTERS: string[] = Array.from({ length: 26 }, (_, i) =>
  String.fromCharCode(65 + i),
);

/** "1" .. "50" — a generous upper bound for numbered entrances. */
export const ENTRANCE_NUMBERS: string[] = Array.from({ length: 50 }, (_, i) => String(i + 1));

/** The full ordered option list for a mode. */
export function entranceOptions(mode: EntranceMode): string[] {
  return mode === 'letters' ? ENTRANCE_LETTERS : ENTRANCE_NUMBERS;
}

/** The position of a value within its mode's option list, or -1. */
function indexOf(mode: EntranceMode, value: string): number {
  return entranceOptions(mode).indexOf(value);
}

/**
 * The inclusive interval between `first` and `last` in the given mode, ordered.
 * Tolerates a reversed pair (first after last) by swapping. Returns an empty
 * list when either bound is unknown for the mode.
 */
export function entranceInterval(mode: EntranceMode, first: string, last: string): string[] {
  const options = entranceOptions(mode);
  const a = indexOf(mode, first);
  const b = indexOf(mode, last);
  if (a < 0 || b < 0) return [];
  const [lo, hi] = a <= b ? [a, b] : [b, a];
  return options.slice(lo, hi + 1);
}

/** The stored entrances list from the settings bag (strings only). */
export function scariList(settings: Record<string, unknown> | undefined): string[] {
  const value = settings?.scari;
  if (!Array.isArray(value)) return [];
  return value.filter((s): s is string => typeof s === 'string' && s.trim() !== '');
}

export interface EntranceConfig {
  mode: EntranceMode;
  first: string;
  last: string;
}

/**
 * Recover the {mode, first, last} interval from a stored entrances list so the
 * picker can be re-seeded. Numbers win only when every entry is numeric;
 * otherwise we treat the list as letters. Falls back to a single "A" when the
 * list is empty or unrecognised.
 */
export function detectEntranceConfig(scari: string[]): EntranceConfig {
  if (scari.length === 0) return { mode: 'letters', first: 'A', last: 'A' };
  const allNumbers = scari.every((s) => ENTRANCE_NUMBERS.includes(s));
  const mode: EntranceMode = allNumbers ? 'numbers' : 'letters';
  const known = scari.filter((s) => indexOf(mode, s) >= 0);
  if (known.length === 0) return { mode: 'letters', first: 'A', last: 'A' };
  const sorted = [...known].sort((x, y) => indexOf(mode, x) - indexOf(mode, y));
  return { mode, first: sorted[0], last: sorted[sorted.length - 1] };
}

/* Identity validation for the admin-facing BuildingSettingsPage (T131). The
   superadmin provisioning surface already format-checks CUI / IBAN / phone /
   contact email, but the admin form only required a non-empty name, so an admin
   could save a malformed IBAN or phone. This mirrors `validateProvisionInput`
   for the fields the admin edits, reusing the shared identity validators so the
   two surfaces stay in lockstep. Pure: no UI or store imports. */

/** The free-text form the BuildingSettingsPage edits before validation. */
export interface BuildingIdentityForm {
  name: string;
  address: string;
  cui: string;
  registration_number: string;
  iban: string;
  contact_phone: string;
  contact_email: string;
}

/** The trimmed/normalised identity, ready to persist (blank optional = ''). */
export type BuildingIdentityValue = BuildingIdentityForm;

/** Per-field outcome, mapped to a bilingual `building.err.*` message. */
export type BuildingFieldError = 'required' | 'tooShort' | 'email' | 'cui' | 'iban' | 'phone';

export type BuildingIdentityErrors = Partial<Record<keyof BuildingIdentityForm, BuildingFieldError>>;

export interface BuildingIdentityValidation {
  errors: BuildingIdentityErrors;
  /** The trimmed, valid identity when there are no errors; null otherwise. */
  value: BuildingIdentityValue | null;
}

/**
 * Validate and normalise the building identity form. Pure: returns the per-field
 * error codes and, when clean, the trimmed/normalised values. The name is
 * required (>= 3 chars); the identity fields (CUI, IBAN, phone, contact email)
 * are optional but format-checked when filled. The IBAN is normalised (no
 * spaces, upper-case) for both validation and storage.
 */
export function validateBuildingIdentity(form: BuildingIdentityForm): BuildingIdentityValidation {
  const name = form.name.trim();
  const address = form.address.trim();
  const cui = form.cui.trim();
  const registration_number = form.registration_number.trim();
  const iban = normalizeIban(form.iban);
  const contact_phone = form.contact_phone.trim();
  const contact_email = form.contact_email.trim();

  const errors: BuildingIdentityErrors = {};
  if (!name) errors.name = 'required';
  else if (name.length < 3) errors.name = 'tooShort';
  if (cui && !isValidCui(cui)) errors.cui = 'cui';
  if (iban && !isValidIban(iban)) errors.iban = 'iban';
  if (contact_phone && !isValidPhone(contact_phone)) errors.contact_phone = 'phone';
  if (contact_email && !isValidEmail(contact_email)) errors.contact_email = 'email';

  const value: BuildingIdentityValue | null =
    Object.keys(errors).length === 0
      ? { name, address, cui, registration_number, iban, contact_phone, contact_email }
      : null;
  return { errors, value };
}
