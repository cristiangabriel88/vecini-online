import { describe, expect, it } from 'vitest';
import {
  generateApartmentsCsvTemplate,
  parseApartmentsCsv,
  resolveImportBatch,
  rowToApartment,
  type ApartmentImportRow,
} from '@/shared/lib/csv';

describe('parseApartmentsCsv', () => {
  it('parses a valid apartment list (legacy headers)', () => {
    const csv = [
      'scara,etaj,numar_apartament,suprafata_utila,cota_parte_indiviza,proprietar_principal_name',
      'A,0,1,54.2,0.041,Ionescu Maria',
      'A,1,5,63,8,0.048,', // malformed extra column tolerated by header mapping
    ].join('\n');
    const res = parseApartmentsCsv(csv);
    expect(res.rows.length).toBeGreaterThanOrEqual(1);
    expect(res.rows[0]).toMatchObject({
      scara: 'A',
      etaj: 0,
      numar_apartament: '1',
      suprafata_utila: 54.2,
      name: 'Ionescu Maria',
    });
  });

  it('parses new-template headers (name, email, numar_persoane, proprietar, opt_in)', () => {
    const csv = [
      'scara,numar_apartament,name,email,numar_persoane,proprietar,opt_in',
      'A,1,Ionescu Maria,maria@exemplu.ro,2,true,true',
      'B,3,Dumitrescu Elena,,1,false,false',
    ].join('\n');
    const res = parseApartmentsCsv(csv);
    expect(res.errors).toHaveLength(0);
    expect(res.rows[0]).toMatchObject({
      scara: 'A',
      numar_apartament: '1',
      name: 'Ionescu Maria',
      email: 'maria@exemplu.ro',
      numar_persoane: 2,
      proprietar: true,
      opt_in: true,
    });
    expect(res.rows[1]).toMatchObject({
      name: 'Dumitrescu Elena',
      email: '',
      numar_persoane: 1,
      proprietar: false,
      opt_in: false,
    });
  });

  it('prefers `name` over legacy `proprietar_principal_name` when both are present', () => {
    const csv = 'numar_apartament,name,proprietar_principal_name\n5,Alice,Bob';
    const res = parseApartmentsCsv(csv);
    expect(res.rows[0].name).toBe('Alice');
  });

  it('falls back to `proprietar_principal_name` when `name` column is absent', () => {
    const csv = 'numar_apartament,proprietar_principal_name\n5,Bob';
    const res = parseApartmentsCsv(csv);
    expect(res.rows[0].name).toBe('Bob');
  });

  it('coerces boolean columns: "true"/"1"/"da" -> true, else false', () => {
    const csv = [
      'numar_apartament,proprietar,opt_in',
      '1,true,1',
      '2,da,yes',
      '3,false,0',
      '4,,',
    ].join('\n');
    const res = parseApartmentsCsv(csv);
    expect(res.rows[0].proprietar).toBe(true);
    expect(res.rows[0].opt_in).toBe(true);
    expect(res.rows[1].proprietar).toBe(true);
    expect(res.rows[1].opt_in).toBe(true);
    expect(res.rows[2].proprietar).toBe(false);
    expect(res.rows[2].opt_in).toBe(false);
    expect(res.rows[3].proprietar).toBe(false);
    expect(res.rows[3].opt_in).toBe(false);
  });

  it('accepts comma decimal separators', () => {
    const csv = 'numar_apartament,suprafata_utila\n12,"54,20"';
    const res = parseApartmentsCsv(csv);
    expect(res.rows[0].suprafata_utila).toBe(54.2);
  });

  it('reports rows missing the apartment number', () => {
    const csv = 'scara,numar_apartament\nA,\nB,7';
    const res = parseApartmentsCsv(csv);
    expect(res.errors.length).toBe(1);
    expect(res.rows.length).toBe(1);
    expect(res.rows[0].numar_apartament).toBe('7');
  });

  it('defaults numar_persoane to null when column is absent', () => {
    const csv = 'numar_apartament\n1';
    const res = parseApartmentsCsv(csv);
    expect(res.rows[0].numar_persoane).toBeNull();
  });
});

describe('generateApartmentsCsvTemplate', () => {
  it('returns a non-empty string', () => {
    const result = generateApartmentsCsvTemplate();
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('first line is the correct header', () => {
    const [header] = generateApartmentsCsvTemplate().split('\r\n');
    expect(header).toBe('scara,numar_apartament,name,email,numar_persoane,proprietar,opt_in');
  });

  it('has exactly 3 sample data rows', () => {
    const lines = generateApartmentsCsvTemplate().split('\r\n');
    // header + 3 sample rows = 4 lines
    expect(lines).toHaveLength(4);
  });

  it('sample rows contain scara, numar_apartament, and opt_in values', () => {
    const lines = generateApartmentsCsvTemplate().split('\r\n');
    const row1 = lines[1].split(',');
    expect(row1[0]).toBe('A');        // scara
    expect(row1[1]).toBe('1');        // numar_apartament
    expect(['true', 'false']).toContain(row1[6]); // opt_in is boolean string
  });

  it('uses CRLF line endings', () => {
    const result = generateApartmentsCsvTemplate();
    expect(result).toContain('\r\n');
    expect(result.split('\r\n').length).toBe(4);
  });

  it('template is parseable by parseApartmentsCsv with all fields populated', () => {
    const template = generateApartmentsCsvTemplate();
    const result = parseApartmentsCsv(template);
    expect(result.errors).toHaveLength(0);
    expect(result.rows).toHaveLength(3);
    expect(result.rows[0].name).toBe('Ionescu Maria');
    expect(result.rows[0].email).toBe('maria.ionescu@exemplu.ro');
    expect(result.rows[0].numar_persoane).toBe(2);
    expect(result.rows[0].proprietar).toBe(true);
    expect(result.rows[0].opt_in).toBe(true);
  });
});

describe('rowToApartment', () => {
  const BASE_ASOCIATIE_ID = 'assoc-1';

  it('creates an Apartment with the correct scalar fields', () => {
    const row = parseApartmentsCsv(
      'scara,numar_apartament,name,email,numar_persoane,proprietar,opt_in\nA,1,Ionescu Maria,maria@exemplu.ro,2,true,true',
    ).rows[0];
    const apt = rowToApartment(row, BASE_ASOCIATIE_ID);
    expect(apt.asociatie_id).toBe(BASE_ASOCIATIE_ID);
    expect(apt.scara).toBe('A');
    expect(apt.numar_apartament).toBe('1');
    expect(apt.proprietar_principal_name).toBe('Ionescu Maria');
    expect(apt.numar_persoane).toBe(2);
    expect(apt.is_active).toBe(true);
    expect(apt.notes).toBeNull();
  });

  it('builds the persons list from name + email + proprietar flag', () => {
    const row = parseApartmentsCsv(
      'scara,numar_apartament,name,email,proprietar\nA,1,Ionescu Maria,maria@exemplu.ro,true',
    ).rows[0];
    const apt = rowToApartment(row, BASE_ASOCIATIE_ID);
    expect(apt.persons).toHaveLength(1);
    const person = apt.persons[0];
    expect(person.name).toBe('Ionescu Maria');
    expect(person.email).toBe('maria@exemplu.ro');
    expect(person.role).toBe('proprietar');
    expect(person.is_primary).toBe(true);
  });

  it('sets person role to "locator" when proprietar is false', () => {
    const row = parseApartmentsCsv(
      'numar_apartament,name,proprietar\n3,Dumitrescu Elena,false',
    ).rows[0];
    const apt = rowToApartment(row, BASE_ASOCIATIE_ID);
    expect(apt.persons[0].role).toBe('locator');
  });

  it('leaves persons empty and numar_persoane 0 when no name is given', () => {
    const row = parseApartmentsCsv('numar_apartament\n5').rows[0];
    const apt = rowToApartment(row, BASE_ASOCIATIE_ID);
    expect(apt.persons).toHaveLength(0);
    expect(apt.numar_persoane).toBe(0);
  });

  it('defaults numar_persoane to 1 when name is present but count is absent', () => {
    const row = parseApartmentsCsv('numar_apartament,name\n5,Alice').rows[0];
    const apt = rowToApartment(row, BASE_ASOCIATIE_ID);
    expect(apt.numar_persoane).toBe(1);
  });

  it('uses explicit numar_persoane when provided, even if it differs from person count', () => {
    const row = parseApartmentsCsv('numar_apartament,name,numar_persoane\n5,Alice,4').rows[0];
    const apt = rowToApartment(row, BASE_ASOCIATIE_ID);
    expect(apt.numar_persoane).toBe(4);
  });

  it('generates unique ids for consecutive calls', () => {
    const row = parseApartmentsCsv('numar_apartament\n1').rows[0];
    const a1 = rowToApartment(row, BASE_ASOCIATIE_ID);
    const a2 = rowToApartment(row, BASE_ASOCIATIE_ID);
    expect(a1.id).not.toBe(a2.id);
  });

  it('sets email to null on the person when email column is empty', () => {
    const row = parseApartmentsCsv('numar_apartament,name,email\n3,Elena,').rows[0];
    const apt = rowToApartment(row, BASE_ASOCIATIE_ID);
    expect(apt.persons[0].email).toBeNull();
  });
});

describe('resolveImportBatch', () => {
  const makeRow = (overrides: Partial<ApartmentImportRow> = {}): ApartmentImportRow => ({
    scara: 'A',
    etaj: null,
    numar_apartament: '1',
    suprafata_utila: null,
    cota_parte_indiviza: null,
    name: 'Ionescu Maria',
    email: 'maria@test.ro',
    numar_persoane: 2,
    proprietar: true,
    opt_in: true,
    ...overrides,
  });

  it('accepts a row not already in the registry', () => {
    const { toCreate, errors } = resolveImportBatch([makeRow()], [], new Set());
    expect(toCreate).toHaveLength(1);
    expect(errors).toHaveLength(0);
  });

  it('rejects a row whose key exists in the registry', () => {
    const { toCreate, errors } = resolveImportBatch([makeRow()], [], new Set(['A|1']));
    expect(toCreate).toHaveLength(0);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/Rândul 1/);
    expect(errors[0]).toMatch(/există deja/);
  });

  it('rejects the second occurrence of a duplicate key within the CSV', () => {
    const row = makeRow();
    const { toCreate, errors } = resolveImportBatch([row, row], [], new Set());
    expect(toCreate).toHaveLength(1);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/duplicat în CSV/);
  });

  it('puts opt_in rows with a non-empty email into toInvite', () => {
    const { toCreate, toInvite } = resolveImportBatch([makeRow()], [], new Set());
    expect(toCreate).toHaveLength(1);
    expect(toInvite).toHaveLength(1);
    expect(toInvite[0]).toBe(toCreate[0]);
  });

  it('excludes opt_in rows with an empty email from toInvite', () => {
    const { toInvite } = resolveImportBatch([makeRow({ email: '' })], [], new Set());
    expect(toInvite).toHaveLength(0);
  });

  it('excludes opt_in=false rows from toInvite even when email is present', () => {
    const { toInvite } = resolveImportBatch([makeRow({ opt_in: false })], [], new Set());
    expect(toInvite).toHaveLength(0);
  });

  it('excludes opt_in rows with a malformed email from toInvite and still creates them', () => {
    const { toCreate, toInvite, errors } = resolveImportBatch(
      [makeRow({ email: 'ionescu' })],
      [],
      new Set(),
    );
    expect(toCreate).toHaveLength(1);
    expect(toInvite).toHaveLength(0);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/Rândul 1/);
    expect(errors[0]).toMatch(/email invalid/);
  });

  it('treats an address missing the domain part as malformed', () => {
    const { toInvite, errors } = resolveImportBatch([makeRow({ email: 'x@' })], [], new Set());
    expect(toInvite).toHaveLength(0);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/email invalid/);
  });

  it('keeps a well-formed email in toInvite with no warning', () => {
    const { toInvite, errors } = resolveImportBatch(
      [makeRow({ email: '  popescu.ion@vecini.online  ' })],
      [],
      new Set(),
    );
    expect(toInvite).toHaveLength(1);
    expect(errors).toHaveLength(0);
  });

  it('does not warn about a malformed email when the row is not opted in', () => {
    const { toInvite, errors } = resolveImportBatch(
      [makeRow({ email: 'ionescu', opt_in: false })],
      [],
      new Set(),
    );
    expect(toInvite).toHaveLength(0);
    expect(errors).toHaveLength(0);
  });

  it('preserves parse-level errors forwarded from parseApartmentsCsv', () => {
    const { errors } = resolveImportBatch([], ['Rândul 1: lipsește numar_apartament'], new Set());
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/lipsește/);
  });

  it('handles rows with no scara (empty string key segment)', () => {
    const row = makeRow({ scara: '' });
    const { toCreate, errors } = resolveImportBatch([row], [], new Set(['|1']));
    expect(toCreate).toHaveLength(0);
    expect(errors[0]).toMatch(/există deja/);
  });

  it('accepts multiple distinct rows with no errors', () => {
    const rows = [makeRow({ numar_apartament: '1' }), makeRow({ numar_apartament: '2' })];
    const { toCreate, errors } = resolveImportBatch(rows, [], new Set());
    expect(toCreate).toHaveLength(2);
    expect(errors).toHaveLength(0);
  });
});
