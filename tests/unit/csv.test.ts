import { describe, expect, it } from 'vitest';
import { parseApartmentsCsv } from '@/shared/lib/csv';

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
