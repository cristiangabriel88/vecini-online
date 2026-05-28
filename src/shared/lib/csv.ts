import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { isValidEmail } from '@/features/auth/authLogic';
import type { Apartment, ApartmentPerson } from '@/shared/types/domain';

export interface ApartmentImportRow {
  scara: string;
  etaj: number | null;
  numar_apartament: string;
  suprafata_utila: number | null;
  cota_parte_indiviza: number | null;
  /**
   * Primary occupant name. Populated from the `name` column (new template)
   * or the legacy `proprietar_principal_name` column.
   */
  name: string;
  /** Optional email for the primary occupant (used for auto-invite in T156). */
  email: string;
  /** Total number of persons in the apartment. */
  numar_persoane: number | null;
  /**
   * Whether this occupant is the owner (proprietar).
   * Coerced: "true"/"1"/"da"/"yes" -> true, else false.
   */
  proprietar: boolean;
  /**
   * Whether to auto-send an invite to this occupant (used in T156).
   * Same boolean coercion as proprietar.
   */
  opt_in: boolean;
}

export interface ImportResult {
  rows: ApartmentImportRow[];
  errors: string[];
}

const REQUIRED = ['numar_apartament'];

function num(v: string | undefined): number | null {
  if (v == null || v.trim() === '') return null;
  const n = Number(v.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/** Coerce a CSV/XLSX cell value to boolean: "Da"/"da"/"true"/"1"/"yes" -> true, else false. */
function bool(v: string | undefined): boolean {
  if (v == null) return false;
  return ['true', '1', 'da', 'yes'].includes(v.trim().toLowerCase());
}

// Romanian-only header used by the downloadable templates (CSV + .xlsx).
// `nume` replaces the old `name` column; `trimite_invitatie` replaces `opt_in`.
const TEMPLATE_HEADERS = [
  'scara',
  'numar_apartament',
  'nume',
  'email',
  'numar_persoane',
  'proprietar',
  'trimite_invitatie',
] as const;

// Sample rows shared by the CSV and .xlsx templates. Booleans rendered as
// "Da"/"Nu" to match what a non-technical Romanian admin expects.
const TEMPLATE_SAMPLE_ROWS: ReadonlyArray<readonly string[]> = [
  ['A', '1', 'Ionescu Maria', 'maria.ionescu@exemplu.ro', '2', 'Da', 'Da'],
  ['A', '2', 'Popescu Ion', 'ion.popescu@exemplu.ro', '3', 'Da', 'Da'],
  ['B', '3', 'Dumitrescu Elena', '', '1', 'Nu', 'Nu'],
];

/**
 * Generate the UTF-8 CSV template for the apartment bulk-import.
 * Header: scara,numar_apartament,nume,email,numar_persoane,proprietar,trimite_invitatie
 * Returns a CRLF-delimited string suitable for a Blob download.
 */
export function generateApartmentsCsvTemplate(): string {
  const header = TEMPLATE_HEADERS.join(',');
  const rows = TEMPLATE_SAMPLE_ROWS.map((r) => r.join(','));
  return [header, ...rows].join('\r\n');
}

/**
 * Generate a real .xlsx workbook for the apartment bulk-import, mirroring the
 * CSV template's header and sample rows. Returned as bytes ready for a Blob
 * download (`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`).
 */
export function generateApartmentsXlsxTemplate(): Uint8Array<ArrayBuffer> {
  const aoa: string[][] = [
    [...TEMPLATE_HEADERS],
    ...TEMPLATE_SAMPLE_ROWS.map((r) => [...r]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Apartamente');
  // SheetJS's `type: 'array'` returns ArrayBuffer in some builds, Uint8Array
  // or number[] in others. Normalise via the Uint8Array constructor (which
  // accepts all three) and re-copy into a fresh ArrayBuffer-backed view so
  // Blob/parser call sites stay cast-free.
  const raw = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as
    | ArrayBuffer
    | Uint8Array
    | number[];
  const view = new Uint8Array(raw as ArrayBuffer);
  const out = new Uint8Array(view.length);
  out.set(view);
  return out;
}

/**
 * Parse an apartment-list CSV into typed rows, collecting per-row errors.
 *
 * Accepts the current Romanian-only template columns (`nume`, `email`,
 * `numar_persoane`, `proprietar`, `trimite_invitatie`) and falls back to the
 * legacy English aliases (`name` -> `nume`, `opt_in` -> `trimite_invitatie`,
 * `proprietar_principal_name` -> `nume`) plus the very-old legacy columns
 * (`etaj`, `suprafata_utila`, `cota_parte_indiviza`). New aliases take
 * precedence when both are present.
 *
 * Boolean columns (`proprietar`, `trimite_invitatie`) accept
 * "Da"/"da"/"true"/"1"/"yes" as true; anything else (including "Nu") is false.
 */
export function parseApartmentsCsv(text: string): ImportResult {
  const parsed = Papa.parse<Record<string, string>>(text.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  const errors: string[] = [];
  const rows: ApartmentImportRow[] = [];

  parsed.data.forEach((raw, i) => {
    const missing = REQUIRED.filter((k) => !raw[k]?.trim());
    if (missing.length) {
      errors.push(`Rândul ${i + 1}: lipsește ${missing.join(', ')}`);
      return;
    }
    // Preferred Romanian column `nume`, with English/legacy fallbacks so a
    // previously-downloaded template still imports.
    const name =
      raw.nume?.trim() ||
      raw.name?.trim() ||
      raw.proprietar_principal_name?.trim() ||
      '';
    const optIn = raw.trimite_invitatie ?? raw.opt_in;
    rows.push({
      scara: raw.scara?.trim() ?? '',
      etaj: num(raw.etaj),
      numar_apartament: raw.numar_apartament.trim(),
      suprafata_utila: num(raw.suprafata_utila),
      cota_parte_indiviza: num(raw.cota_parte_indiviza),
      name,
      email: raw.email?.trim() ?? '',
      numar_persoane: num(raw.numar_persoane),
      proprietar: bool(raw.proprietar),
      opt_in: bool(optIn),
    });
  });

  return { rows, errors };
}

/**
 * Parse an apartment-list .xlsx workbook into the same typed rows produced by
 * `parseApartmentsCsv`. The first worksheet is read, converted to CSV, then
 * funnelled through the CSV parser so column-mapping and validation logic stay
 * in one place.
 */
export function parseApartmentsXlsx(buffer: ArrayBuffer): ImportResult {
  // SheetJS's `type: 'array'` expects an index-able byte sequence (Uint8Array
  // or number[]), not a raw ArrayBuffer; wrapping is required or every byte
  // reads as zero.
  const wb = XLSX.read(new Uint8Array(buffer), { type: 'array' });
  const firstSheetName = wb.SheetNames[0];
  if (!firstSheetName) {
    return { rows: [], errors: ['Fișierul nu conține nicio foaie de lucru.'] };
  }
  const ws = wb.Sheets[firstSheetName];
  const csv = XLSX.utils.sheet_to_csv(ws, { FS: ',', blankrows: false });
  return parseApartmentsCsv(csv);
}

export interface ImportBatchResult {
  /** Rows accepted for creation (no duplicate, no parse error). */
  toCreate: ApartmentImportRow[];
  /** Subset of toCreate where opt_in is true and email is valid. */
  toInvite: ApartmentImportRow[];
  /**
   * Blocking errors: the row was rejected and NOT created
   * (parse failures, already-exists, intra-CSV duplicate).
   */
  errors: string[];
  /**
   * Non-blocking warnings: the apartment WAS created but something was skipped
   * (e.g. invalid email -- invite not sent).
   */
  warnings: string[];
}

/**
 * Resolve a parsed CSV batch against the already-registered apartment keys
 * (`"${scara}|${numar_apartament}"`) for an asociație.
 *
 * Returns which rows should be created, which should trigger an invite (opt-in
 * with email), and any errors encountered (parse errors forwarded unchanged,
 * plus duplicate-key errors detected here). Pure: no store access.
 */
export function resolveImportBatch(
  rows: ApartmentImportRow[],
  parseErrors: string[],
  existingApartmentKeys: ReadonlySet<string>,
): ImportBatchResult {
  const errors = [...parseErrors];
  const warnings: string[] = [];
  const toCreate: ApartmentImportRow[] = [];
  const toInvite: ApartmentImportRow[] = [];
  const csvKeys = new Set<string>();

  rows.forEach((row, i) => {
    const key = `${row.scara}|${row.numar_apartament}`;
    const label = row.scara
      ? `Ap. ${row.numar_apartament} Sc. ${row.scara}`
      : `Ap. ${row.numar_apartament}`;

    if (existingApartmentKeys.has(key)) {
      errors.push(`Rândul ${i + 1}: ${label} există deja.`);
      return;
    }
    if (csvKeys.has(key)) {
      errors.push(`Rândul ${i + 1}: ${label} duplicat în CSV.`);
      return;
    }
    csvKeys.add(key);
    toCreate.push(row);
    if (row.opt_in && row.email) {
      // The apartment is still created; only the invite is withheld when the
      // opted-in resident's address is malformed, so we never store a bad
      // recipient on the invite or fire a doomed send.
      if (isValidEmail(row.email)) {
        toInvite.push(row);
      } else {
        // Non-blocking: apartment imported, invite skipped.
        warnings.push(
          `Rândul ${i + 1}: ${label} are email invalid, invitația nu a fost trimisă.`,
        );
      }
    }
  });

  return { toCreate, toInvite, errors, warnings };
}

/**
 * Convert a parsed CSV row into an Apartment ready to persist in the registry.
 *
 * When a primary occupant name is present it is added to the `persons` list
 * with their role derived from the `proprietar` flag and their optional email.
 * `numar_persoane` defaults to 1 when a name is present, or 0 if not, unless
 * the CSV supplied an explicit value.
 */
export function rowToApartment(row: ApartmentImportRow, asociatieId: string): Apartment {
  const now = new Date().toISOString();
  const persons: ApartmentPerson[] = row.name
    ? [
        {
          id: `pe-${crypto.randomUUID()}`,
          name: row.name,
          role: row.proprietar ? 'proprietar' : 'locator',
          is_primary: true,
          email: row.email || null,
        },
      ]
    : [];
  const numar_persoane =
    row.numar_persoane !== null ? row.numar_persoane : row.name ? 1 : 0;
  return {
    id: `ap-${crypto.randomUUID()}`,
    asociatie_id: asociatieId,
    scara: row.scara || null,
    etaj: row.etaj,
    numar_apartament: row.numar_apartament,
    suprafata_utila: row.suprafata_utila,
    cota_parte_indiviza: row.cota_parte_indiviza,
    numar_persoane,
    persons,
    proprietar_principal_name: row.name || null,
    is_active: true,
    notes: null,
    created_at: now,
    updated_at: now,
  };
}
