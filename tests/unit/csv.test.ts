import { describe, expect, it } from 'vitest';
import { generateApartmentsCsvTemplate, parseApartmentsCsv } from '@/shared/lib/csv';

describe('parseApartmentsCsv', () => {
  it('parses a valid apartment list', () => {
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
      proprietar_principal_name: 'Ionescu Maria',
    });
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
});
