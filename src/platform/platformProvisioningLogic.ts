import { isValidEmail } from '@/features/auth/authLogic';
import { generateInviteCode } from '@/shared/lib/inviteCode';
import type { PlatformAsociatieSummary } from './demoPlatform';

/**
 * Pure provisioning logic for the superadmin console (T94).
 *
 * The platform operator creates an asociație and provisions its **first
 * administrator** — the operator never adds residents; the admin onboards their
 * own members through the existing invite lifecycle (T41/T42). This module holds
 * the side-effect-free shape so it unit-tests in isolation and drives both the
 * offline/demo path (the local store) and, later, the live path: the privileged
 * cross-tenant write (create the asociație + the admin's auth account) runs only
 * in the T92 service-role Netlify function, never in the browser, because the
 * client is never trusted with the super_admin role (see CLAUDE.md non-negotiables).
 *
 * Offline there is no auth backend, so "provisioning the admin" mints a one-time
 * setup code the operator hands to the new administrator (the admin completes
 * sign-up with it). The code uses the same unambiguous generator as tenant invite
 * codes (T41) and is regenerated on the rare chance it collides with one already
 * issued, so codes stay unique.
 */

/**
 * The free-text form draft the provisioning surface edits before validation.
 * Beyond the required core (asociație name + city, admin name + email) the
 * operator captures the asociație's identity up front (T122): fiscal id, the
 * official registration number, the bank account it collects into, the street
 * address and a public contact. The identity fields are optional but, when
 * filled, are format-checked so a typo is caught before it reaches the live path.
 */
export interface ProvisionInputDraft {
  asociatieName: string;
  city: string;
  address: string;
  cui: string;
  registrationNumber: string;
  iban: string;
  contactPhone: string;
  contactEmail: string;
  adminName: string;
  adminEmail: string;
}

/** A validated, trimmed and normalised provisioning request. */
export interface ProvisionInput {
  asociatieName: string;
  city: string;
  address: string;
  cui: string;
  registrationNumber: string;
  iban: string;
  contactPhone: string;
  contactEmail: string;
  adminName: string;
  adminEmail: string;
}

/** Per-field validation outcome, mapped to a bilingual `platform.asociatii.err.*`. */
export type ProvisionFieldError = 'required' | 'tooShort' | 'email' | 'cui' | 'iban' | 'phone';

export type ProvisionErrors = Partial<Record<keyof ProvisionInputDraft, ProvisionFieldError>>;

export interface ProvisionValidation {
  errors: ProvisionErrors;
  /** The trimmed, valid request when there are no errors; null otherwise. */
  value: ProvisionInput | null;
}

/** An empty draft for a fresh provisioning form. */
export function blankProvisionInput(): ProvisionInputDraft {
  return {
    asociatieName: '',
    city: '',
    address: '',
    cui: '',
    registrationNumber: '',
    iban: '',
    contactPhone: '',
    contactEmail: '',
    adminName: '',
    adminEmail: '',
  };
}

/** Normalise an IBAN: drop spaces, upper-case. Pure; used for validation + storage. */
export function normalizeIban(raw: string): string {
  return raw.replace(/\s+/g, '').toUpperCase();
}

/**
 * Accept a structurally plausible IBAN (2-letter country code, 2 check digits,
 * 11-30 alphanumerics; 15-34 total). This is format-only, not a mod-97 checksum,
 * which is enough to catch a typo at provisioning without rejecting a valid
 * foreign account. Romanian IBANs are 24 chars and pass.
 */
export function isValidIban(raw: string): boolean {
  const v = normalizeIban(raw);
  return v.length >= 15 && v.length <= 34 && /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(v);
}

/** Accept a Romanian fiscal code: optional RO prefix then 2-10 digits. */
export function isValidCui(raw: string): boolean {
  return /^(RO)?\d{2,10}$/i.test(raw.replace(/\s+/g, ''));
}

/** Accept a phone made of digits and the usual separators, 7-15 digits. */
export function isValidPhone(raw: string): boolean {
  const v = raw.trim();
  if (!/^[+()\d\s.-]+$/.test(v)) return false;
  const digits = v.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

/**
 * Validate and normalise a provisioning draft. Pure: returns the per-field error
 * codes and, when clean, the trimmed/normalised request. The required core guards
 * against an obviously incomplete asociație name (3) / city + admin name (2), and
 * the admin email reuses the shared `isValidEmail`. The identity fields are
 * optional: a blank one is accepted, a filled one is format-checked (CUI, IBAN,
 * phone, contact email). The IBAN is stored normalised (no spaces, upper-case).
 */
export function validateProvisionInput(draft: ProvisionInputDraft): ProvisionValidation {
  const asociatieName = draft.asociatieName.trim();
  const city = draft.city.trim();
  const address = draft.address.trim();
  const cui = draft.cui.trim();
  const registrationNumber = draft.registrationNumber.trim();
  const iban = normalizeIban(draft.iban);
  const contactPhone = draft.contactPhone.trim();
  const contactEmail = draft.contactEmail.trim();
  const adminName = draft.adminName.trim();
  const adminEmail = draft.adminEmail.trim();

  const errors: ProvisionErrors = {};
  if (!asociatieName) errors.asociatieName = 'required';
  else if (asociatieName.length < 3) errors.asociatieName = 'tooShort';
  if (!city) errors.city = 'required';
  else if (city.length < 2) errors.city = 'tooShort';
  if (cui && !isValidCui(cui)) errors.cui = 'cui';
  if (iban && !isValidIban(iban)) errors.iban = 'iban';
  if (contactPhone && !isValidPhone(contactPhone)) errors.contactPhone = 'phone';
  if (contactEmail && !isValidEmail(contactEmail)) errors.contactEmail = 'email';
  if (!adminName) errors.adminName = 'required';
  else if (adminName.length < 2) errors.adminName = 'tooShort';
  if (!adminEmail) errors.adminEmail = 'required';
  else if (!isValidEmail(adminEmail)) errors.adminEmail = 'email';

  const value: ProvisionInput | null =
    Object.keys(errors).length === 0
      ? {
          asociatieName,
          city,
          address,
          cui,
          registrationNumber,
          iban,
          contactPhone,
          contactEmail,
          adminName,
          adminEmail,
        }
      : null;
  return { errors, value };
}

/** Stable id generator for a platform-provisioned asociație (offline path). */
export function newPlatformAsociatieId(): string {
  return `platform-asoc-${crypto.randomUUID()}`;
}

/** The first administrator provisioned alongside a new asociație. */
export interface ProvisionedAdmin {
  name: string;
  email: string;
  /** One-time setup code the operator hands to the new admin (offline path). */
  setupCode: string;
}

export interface ProvisionResult {
  asociatie: PlatformAsociatieSummary;
  admin: ProvisionedAdmin;
}

/**
 * Build a freshly provisioned asociație + its first admin from a validated
 * request. Pure: the caller supplies the existing setup codes (for collision
 * avoidance), the clock and the RNG. A new asociație starts with zero members and
 * apartments and no recorded admin sign-in (the admin has not logged in yet).
 */
export function provisionAsociatie(
  value: ProvisionInput,
  existingCodes: Iterable<string> = [],
  rng: () => number = Math.random,
): ProvisionResult {
  const taken = new Set(existingCodes);
  let setupCode = generateInviteCode(rng);
  while (taken.has(setupCode)) setupCode = generateInviteCode(rng);
  return {
    asociatie: {
      id: newPlatformAsociatieId(),
      name: value.asociatieName,
      city: value.city,
      members: 0,
      apartments: 0,
      lastAdminSignInAt: null,
      address: value.address,
      cui: value.cui,
      registrationNumber: value.registrationNumber,
      iban: value.iban,
      contactPhone: value.contactPhone,
      contactEmail: value.contactEmail,
    },
    admin: { name: value.adminName, email: value.adminEmail, setupCode },
  };
}

/** Sort asociații by display name (Romanian collation). Does not mutate the input. */
export function sortAsociatii(rows: PlatformAsociatieSummary[]): PlatformAsociatieSummary[] {
  return [...rows].sort((a, b) => a.name.localeCompare(b.name, 'ro'));
}

/** Days since a date, or null when never (used for the dormant-asociație signal). */
export function daysSince(iso: string | null, now: Date = new Date()): number | null {
  if (!iso) return null;
  return Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000);
}

/** An asociație is "dormant" when no admin has signed in within the window. */
export const DORMANT_AFTER_DAYS = 30;

export function isDormant(iso: string | null, now: Date = new Date()): boolean {
  const days = daysSince(iso, now);
  return days === null || days >= DORMANT_AFTER_DAYS;
}
