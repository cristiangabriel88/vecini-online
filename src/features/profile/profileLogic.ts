import type { Locale } from '@/shared/types/domain';

/**
 * F66 Profil complet — pure, backend-free profile model + validation.
 *
 * The profile editor lets a resident keep a rich identity: a photo (stored as a
 * data URL offline, a Storage object path live), a structured set of standard
 * fields, and any number of user-added custom fields with an explicit type and a
 * private / visible-to-neighbours visibility flag. Everything here is pure so it
 * is unit-tested without React or a backend; the persisted store (`profileStore`)
 * wraps it and the page renders it.
 */

/** The typed catalog a custom field can take (FEATURES.md F66). */
export type CustomFieldType =
  | 'text'
  | 'longtext'
  | 'number'
  | 'phone'
  | 'email'
  | 'date'
  | 'bool'
  | 'select'
  | 'link'
  | 'address';

export const CUSTOM_FIELD_TYPES: CustomFieldType[] = [
  'text',
  'longtext',
  'number',
  'phone',
  'email',
  'date',
  'bool',
  'select',
  'link',
  'address',
];

/** Who may see a field: only the owner + admin, or surfaced to neighbours (F36). */
export type FieldVisibility = 'private' | 'neighbours';

export interface CustomField {
  id: string;
  label: string;
  type: CustomFieldType;
  /** Value as a string; `bool` is 'true'/'false', `select` is the chosen option. */
  value: string;
  /** Options for the `select` type (ignored otherwise). */
  options: string[];
  visibility: FieldVisibility;
  sortOrder: number;
}

export interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

/**
 * The full profile. Standard fields mirror the columns the live migration adds
 * to `users`; `customFields` mirrors the `profile_custom_fields` table.
 */
export interface ProfileData {
  userId: string;
  email: string;
  fullName: string;
  displayName: string;
  phone: string;
  /** Profile photo as a data URL offline (a Storage path live); null = initials. */
  avatarDataUrl: string | null;
  apartmentId: string | null;
  scara: string;
  etaj: string;
  /** Car plate, feeds F28 Parcare. */
  carPlate: string;
  address: string;
  emergencyContact: EmergencyContact;
  /** Date of birth (yyyy-mm-dd), feeds F63 Aniversări opt-in. */
  dateOfBirth: string;
  locale: Locale;
  customFields: CustomField[];
}

export function emptyEmergencyContact(): EmergencyContact {
  return { name: '', phone: '', relationship: '' };
}

export function emptyProfile(userId: string, email: string): ProfileData {
  return {
    userId,
    email,
    fullName: '',
    displayName: '',
    phone: '',
    avatarDataUrl: null,
    apartmentId: null,
    scara: '',
    etaj: '',
    carPlate: '',
    address: '',
    emergencyContact: emptyEmergencyContact(),
    dateOfBirth: '',
    locale: 'ro',
    customFields: [],
  };
}

/** Two-letter initials from a name, for the avatar fallback. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

// ── Avatar photo (offline data URL, live Storage object) ────────────────────
// The resident's photo is center-cropped to a square and downscaled before it is
// stored, so the offline data URL stays small and the displayed (circular)
// avatar is always square. The crop maths is pure + unit-tested; the actual
// canvas draw happens in the page where the DOM is available.

/** Longest edge (px) of the stored square avatar thumbnail. */
export const AVATAR_MAX_DIM = 256;
/** Reject source images larger than this before reading them (5 MB). */
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

/** Whether a MIME type is an image we accept for the avatar. */
export function isAcceptedImageType(mime: string): boolean {
  return /^image\/(png|jpe?g|webp|gif)$/i.test(mime);
}

/** The centered square crop of a `width`×`height` source: offset + side length. */
export function squareCropRect(
  width: number,
  height: number,
): { sx: number; sy: number; size: number } {
  const size = Math.max(0, Math.min(Math.floor(width), Math.floor(height)));
  return {
    sx: Math.round((width - size) / 2),
    sy: Math.round((height - size) / 2),
    size,
  };
}

/** The square thumbnail side for a crop of `cropSize`, capped at `AVATAR_MAX_DIM`. */
export function avatarThumbDim(cropSize: number): number {
  return Math.min(AVATAR_MAX_DIM, Math.max(1, Math.round(cropSize)));
}

// ── Validation ────────────────────────────────────────────────────────────
// Each validator returns a stable error key (resolved by i18n) or null when the
// value is acceptable. Empty optional values are always acceptable; "required"
// is handled separately by completeness, not by these validators.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// RO plate: Bucharest "B" allows 2-3 digits; counties use a 2-letter code + 2
// digits; both end in 3 letters. Spaces between the groups are optional.
const PLATE_RE = /^(B\d{2,3}|[A-Z]{2}\d{2})[A-Z]{3}$/;
const URL_RE = /^https?:\/\/[^\s.]+\.[^\s]+$/i;

export function isBlank(value: string): boolean {
  return value.trim().length === 0;
}

export function validateEmail(value: string): string | null {
  if (isBlank(value)) return null;
  return EMAIL_RE.test(value.trim()) ? null : 'invalidEmail';
}

export function validatePhone(value: string): string | null {
  if (isBlank(value)) return null;
  const digits = value.replace(/[\s\-().]/g, '');
  return /^\+?\d{7,15}$/.test(digits) ? null : 'invalidPhone';
}

/** Normalise a plate to uppercase with no separators for comparison/storage. */
export function normalizePlate(value: string): string {
  return value.toUpperCase().replace(/[\s-]/g, '');
}

export function validatePlate(value: string): string | null {
  if (isBlank(value)) return null;
  return PLATE_RE.test(normalizePlate(value)) ? null : 'invalidPlate';
}

export function validateDate(value: string, now: Date = new Date()): string | null {
  if (isBlank(value)) return null;
  const ts = Date.parse(value);
  if (Number.isNaN(ts)) return 'invalidDate';
  if (ts > now.getTime()) return 'futureDate';
  return null;
}

export function validateNumber(value: string): string | null {
  if (isBlank(value)) return null;
  return /^-?\d+(\.\d+)?$/.test(value.trim()) ? null : 'invalidNumber';
}

export function validateLink(value: string): string | null {
  if (isBlank(value)) return null;
  return URL_RE.test(value.trim()) ? null : 'invalidLink';
}

/** Validate a custom field's value against its declared type. */
export function validateCustomFieldValue(type: CustomFieldType, value: string): string | null {
  switch (type) {
    case 'email':
      return validateEmail(value);
    case 'phone':
      return validatePhone(value);
    case 'date':
      return validateDate(value);
    case 'number':
      return validateNumber(value);
    case 'link':
      return validateLink(value);
    case 'bool':
    case 'select':
    case 'text':
    case 'longtext':
    case 'address':
    default:
      return null;
  }
}

/** Collected per-field errors for the standard section (empty when all valid). */
export function validateStandard(profile: ProfileData): Record<string, string> {
  const errors: Record<string, string> = {};
  const email = validateEmail(profile.email);
  if (email) errors.email = email;
  const phone = validatePhone(profile.phone);
  if (phone) errors.phone = phone;
  const plate = validatePlate(profile.carPlate);
  if (plate) errors.carPlate = plate;
  const dob = validateDate(profile.dateOfBirth);
  if (dob) errors.dateOfBirth = dob;
  const ephone = validatePhone(profile.emergencyContact.phone);
  if (ephone) errors.emergencyPhone = ephone;
  return errors;
}

export function hasValidationErrors(profile: ProfileData): boolean {
  return Object.keys(validateStandard(profile)).length > 0;
}

// ── Completeness ────────────────────────────────────────────────────────────
// A nudge metric over the standard fields a resident is encouraged to fill in.

const COMPLETENESS_CHECKS: ((p: ProfileData) => boolean)[] = [
  (p) => !isBlank(p.fullName),
  (p) => !isBlank(p.displayName),
  (p) => !isBlank(p.phone),
  (p) => !isBlank(p.email),
  (p) => p.avatarDataUrl !== null,
  (p) => p.apartmentId !== null,
  (p) => !isBlank(p.carPlate),
  (p) => !isBlank(p.address),
  (p) => !isBlank(p.emergencyContact.name) && !isBlank(p.emergencyContact.phone),
  (p) => !isBlank(p.dateOfBirth),
];

/** Percentage (0-100) of the tracked standard fields that are filled. */
export function completeness(profile: ProfileData): number {
  const filled = COMPLETENESS_CHECKS.filter((check) => check(profile)).length;
  return Math.round((filled / COMPLETENESS_CHECKS.length) * 100);
}

// ── Custom-field operations (pure, non-mutating) ────────────────────────────

function nextSortOrder(fields: CustomField[]): number {
  return fields.reduce((max, f) => Math.max(max, f.sortOrder), -1) + 1;
}

export function newCustomField(
  label: string,
  type: CustomFieldType,
  visibility: FieldVisibility,
  fields: CustomField[],
  id: string,
  options: string[] = [],
): CustomField {
  return {
    id,
    label: label.trim(),
    type,
    value: '',
    options: options.map((o) => o.trim()).filter(Boolean),
    visibility,
    sortOrder: nextSortOrder(fields),
  };
}

export function addCustomField(fields: CustomField[], field: CustomField): CustomField[] {
  return [...fields, field];
}

export function updateCustomField(
  fields: CustomField[],
  id: string,
  patch: Partial<Omit<CustomField, 'id'>>,
): CustomField[] {
  return fields.map((f) => (f.id === id ? { ...f, ...patch } : f));
}

export function removeCustomField(fields: CustomField[], id: string): CustomField[] {
  return fields.filter((f) => f.id !== id);
}

/** Move a field one slot up or down, keeping `sortOrder` contiguous and stable. */
export function moveCustomField(
  fields: CustomField[],
  id: string,
  direction: 'up' | 'down',
): CustomField[] {
  const ordered = sortedCustomFields(fields);
  const index = ordered.findIndex((f) => f.id === id);
  if (index === -1) return fields;
  const target = direction === 'up' ? index - 1 : index + 1;
  if (target < 0 || target >= ordered.length) return fields;
  const swapped = [...ordered];
  [swapped[index], swapped[target]] = [swapped[target], swapped[index]];
  return swapped.map((f, i) => ({ ...f, sortOrder: i }));
}

/** Custom fields in display order (ascending `sortOrder`). */
export function sortedCustomFields(fields: CustomField[]): CustomField[] {
  return [...fields].sort((a, b) => a.sortOrder - b.sortOrder);
}

/** Fields the resident has marked visible to neighbours (feeds F36 directory). */
export function neighbourVisibleFields(fields: CustomField[]): CustomField[] {
  return sortedCustomFields(fields).filter(
    (f) => f.visibility === 'neighbours' && !isBlank(f.value),
  );
}
