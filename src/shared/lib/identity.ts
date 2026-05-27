import { isValidEmail } from '@/features/auth/authLogic';

/**
 * Shared, app-importable validators for an asociație's identity fields
 * (T131). These were first written for the superadmin provisioning surface
 * (`src/platform/platformProvisioningLogic.ts`) but are needed by the
 * admin-facing `BuildingSettingsPage` too, and the main app must never import
 * from `src/platform`. They live here so both tiers share one definition.
 *
 * `isValidEmail` is re-exported so a caller can validate every identity field
 * from a single module.
 */

export { isValidEmail };

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
