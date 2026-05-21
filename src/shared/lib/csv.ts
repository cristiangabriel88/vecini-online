import Papa from 'papaparse';

export interface ApartmentImportRow {
  scara: string;
  etaj: number | null;
  numar_apartament: string;
  suprafata_utila: number | null;
  cota_parte_indiviza: number | null;
  proprietar_principal_name: string;
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

/** Parse an apartment-list CSV into typed rows, collecting per-row errors. */
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
    rows.push({
      scara: raw.scara?.trim() ?? '',
      etaj: num(raw.etaj),
      numar_apartament: raw.numar_apartament.trim(),
      suprafata_utila: num(raw.suprafata_utila),
      cota_parte_indiviza: num(raw.cota_parte_indiviza),
      proprietar_principal_name: raw.proprietar_principal_name?.trim() ?? '',
    });
  });

  return { rows, errors };
}
