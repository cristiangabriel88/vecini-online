import Papa from 'papaparse';
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

/** Coerce a CSV string value to boolean: "true"/"1"/"da"/"yes" -> true, else false. */
function bool(v: string | undefined): boolean {
  if (v == null) return false;
  return ['true', '1', 'da', 'yes'].includes(v.trim().toLowerCase());
}

/**
 * Generate the UTF-8 CSV template for the apartment bulk-import.
 * Header: scara,numar_apartament,name,email,numar_persoane,proprietar,opt_in
 * Returns a CRLF-delimited string suitable for a Blob download.
 */
export function generateApartmentsCsvTemplate(): string {
  const header = 'scara,numar_apartament,name,email,numar_persoane,proprietar,opt_in';
  const rows = [
    'A,1,Ionescu Maria,maria.ionescu@exemplu.ro,2,true,true',
    'A,2,Popescu Ion,ion.popescu@exemplu.ro,3,true,true',
    'B,3,Dumitrescu Elena,,1,false,false',
  ];
  return [header, ...rows].join('\r\n');
}

/**
 * Parse an apartment-list CSV into typed rows, collecting per-row errors.
 *
 * Accepts both the new template columns (name, email, numar_persoane, proprietar,
 * opt_in) and the legacy columns (proprietar_principal_name, etaj,
 * suprafata_utila, cota_parte_indiviza). When both `name` and
 * `proprietar_principal_name` are present, `name` takes precedence.
 *
 * Boolean columns (`proprietar`, `opt_in`) accept "true"/"1"/"da"/"yes".
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
    // Accept `name` (new template) or `proprietar_principal_name` (legacy alias).
    const name = raw.name?.trim() || raw.proprietar_principal_name?.trim() || '';
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
      opt_in: bool(raw.opt_in),
    });
  });

  return { rows, errors };
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
