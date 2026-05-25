import { z } from 'zod';
import type { Apartment, ApartmentPerson } from '@/shared/types/domain';

/* Apartment registry (admin) — pure helpers for creating, validating and
   reshaping apartments. No UI, store or network imports so it stays unit
   testable. The zustand store and the dual-mode repository build on top. */

/** The editable fields an admin supplies for one apartment. Strings come
 *  straight from form inputs; numeric fields are parsed/validated here. */
export interface ApartmentInput {
  scara: string;
  etaj: string;
  numar_apartament: string;
  suprafata_utila: string;
  cota_parte_indiviza: string;
  numar_persoane: string;
  proprietar_principal_name: string;
  notes: string;
}

/** Empty owner roles, kept in one place so the form selects and the validator
 *  agree on the allowed set. */
export const PERSON_ROLES: ApartmentPerson['role'][] = ['proprietar', 'chirias', 'locator'];

/** Parse a Romanian-or-English decimal string ("4,8" or "4.8") into a number,
 *  or null when blank/invalid. */
function parseDecimal(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const n = Number(trimmed.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/** A blank input row, used to seed the bulk-add grid and the edit form. */
export function blankApartmentInput(): ApartmentInput {
  return {
    scara: '',
    etaj: '',
    numar_apartament: '',
    suprafata_utila: '',
    cota_parte_indiviza: '',
    numar_persoane: '',
    proprietar_principal_name: '',
    notes: '',
  };
}

/** `count` blank rows for the first-setup grid (clamped to a sane range). */
export function blankGridRows(count: number): ApartmentInput[] {
  const n = Math.max(0, Math.min(500, Math.floor(count || 0)));
  return Array.from({ length: n }, () => blankApartmentInput());
}

/** Turn an existing apartment back into an editable input row. */
export function apartmentToInput(a: Apartment): ApartmentInput {
  return {
    scara: a.scara ?? '',
    etaj: a.etaj == null ? '' : String(a.etaj),
    numar_apartament: a.numar_apartament,
    suprafata_utila: a.suprafata_utila == null ? '' : String(a.suprafata_utila),
    // Show as a percent, trimming binary-float noise (0.041 * 100 -> "4.1").
    cota_parte_indiviza:
      a.cota_parte_indiviza == null
        ? ''
        : String(Number((a.cota_parte_indiviza * 100).toFixed(4))),
    numar_persoane: String(a.numar_persoane),
    proprietar_principal_name: a.proprietar_principal_name ?? '',
    notes: a.notes ?? '',
  };
}

/**
 * Validation schema for one apartment input. `numar_apartament` is the only hard
 * requirement (mirrors the CSV importer and the DB unique key). Numeric fields
 * are optional but, when present, must be sane: non-negative area, a cota-parte
 * percent in [0, 100], whole non-negative floor and person counts.
 */
export const apartmentInputSchema = z
  .object({
    scara: z.string(),
    etaj: z.string(),
    numar_apartament: z.string().trim().min(1, 'required'),
    suprafata_utila: z.string(),
    cota_parte_indiviza: z.string(),
    numar_persoane: z.string(),
    proprietar_principal_name: z.string(),
    notes: z.string(),
  })
  .superRefine((val, ctx) => {
    const area = parseDecimal(val.suprafata_utila);
    if (val.suprafata_utila.trim() !== '' && (area === null || area < 0)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['suprafata_utila'], message: 'invalid' });
    }
    const cota = parseDecimal(val.cota_parte_indiviza);
    if (val.cota_parte_indiviza.trim() !== '' && (cota === null || cota < 0 || cota > 100)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['cota_parte_indiviza'], message: 'invalid' });
    }
    const etaj = parseDecimal(val.etaj);
    if (val.etaj.trim() !== '' && (etaj === null || !Number.isInteger(etaj))) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['etaj'], message: 'invalid' });
    }
    const persoane = parseDecimal(val.numar_persoane);
    if (
      val.numar_persoane.trim() !== '' &&
      (persoane === null || !Number.isInteger(persoane) || persoane < 0)
    ) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['numar_persoane'], message: 'invalid' });
    }
  });

/** Field-keyed validation errors (message codes), empty object when valid. */
export function validateApartment(input: ApartmentInput): Partial<Record<keyof ApartmentInput, string>> {
  const res = apartmentInputSchema.safeParse(input);
  if (res.success) return {};
  const errors: Partial<Record<keyof ApartmentInput, string>> = {};
  for (const issue of res.error.issues) {
    const key = issue.path[0] as keyof ApartmentInput;
    if (key && !errors[key]) errors[key] = issue.message;
  }
  return errors;
}

/** True when the input has nothing the user actually typed (skip blank grid rows). */
export function isBlankInput(input: ApartmentInput): boolean {
  return (
    input.numar_apartament.trim() === '' &&
    input.scara.trim() === '' &&
    input.etaj.trim() === '' &&
    input.suprafata_utila.trim() === '' &&
    input.cota_parte_indiviza.trim() === '' &&
    input.numar_persoane.trim() === '' &&
    input.proprietar_principal_name.trim() === '' &&
    input.notes.trim() === ''
  );
}

/** A fresh named occupant for the person-list editor. */
export function newPerson(role: ApartmentPerson['role'] = 'locator'): ApartmentPerson {
  return { id: `pe-${crypto.randomUUID()}`, name: '', role, is_primary: false };
}

/** The fields shared by create and update, derived from a validated input.
 *  `numar_persoane` defaults to the person-list length when the admin left the
 *  count blank, but an explicit value always wins. */
function inputToFields(
  input: ApartmentInput,
  persons: ApartmentPerson[],
): Pick<
  Apartment,
  | 'scara'
  | 'etaj'
  | 'numar_apartament'
  | 'suprafata_utila'
  | 'cota_parte_indiviza'
  | 'numar_persoane'
  | 'persons'
  | 'proprietar_principal_name'
  | 'notes'
> {
  const cota = parseDecimal(input.cota_parte_indiviza);
  const explicitCount = parseDecimal(input.numar_persoane);
  const cleanPersons = persons
    .map((p) => ({ ...p, name: p.name.trim() }))
    .filter((p) => p.name !== '');
  return {
    scara: input.scara.trim() || null,
    etaj: input.etaj.trim() === '' ? null : parseDecimal(input.etaj),
    numar_apartament: input.numar_apartament.trim(),
    suprafata_utila: parseDecimal(input.suprafata_utila),
    // The form shows cota-parte as a percent (4.8); store the indivisible share (0.048).
    cota_parte_indiviza: cota === null ? null : cota / 100,
    numar_persoane:
      explicitCount !== null ? explicitCount : cleanPersons.length || 0,
    persons: cleanPersons,
    proprietar_principal_name: input.proprietar_principal_name.trim() || null,
    notes: input.notes.trim() || null,
  };
}

/** Build a new apartment for an asociație from a validated input + person list. */
export function newApartment(
  input: ApartmentInput,
  asociatieId: string,
  persons: ApartmentPerson[] = [],
): Apartment {
  const now = new Date().toISOString();
  return {
    id: `ap-${crypto.randomUUID()}`,
    asociatie_id: asociatieId,
    is_active: true,
    created_at: now,
    updated_at: now,
    ...inputToFields(input, persons),
  };
}

/** Apply an edited input + person list onto an existing apartment. */
export function applyApartmentEdit(
  apartment: Apartment,
  input: ApartmentInput,
  persons: ApartmentPerson[],
): Apartment {
  return {
    ...apartment,
    updated_at: new Date().toISOString(),
    ...inputToFields(input, persons),
  };
}

/** Stable display order: by scara, then floor, then numeric apartment number. */
export function sortApartments(list: Apartment[]): Apartment[] {
  return [...list].sort((a, b) => {
    const sc = (a.scara ?? '').localeCompare(b.scara ?? '', 'ro');
    if (sc !== 0) return sc;
    const fl = (a.etaj ?? 0) - (b.etaj ?? 0);
    if (fl !== 0) return fl;
    const an = Number(a.numar_apartament);
    const bn = Number(b.numar_apartament);
    if (Number.isFinite(an) && Number.isFinite(bn) && an !== bn) return an - bn;
    return a.numar_apartament.localeCompare(b.numar_apartament, 'ro');
  });
}
