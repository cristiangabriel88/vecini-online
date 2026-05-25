import { describe, expect, it } from 'vitest';
import {
  apartmentToInput,
  applyApartmentEdit,
  blankApartmentInput,
  blankGridRows,
  isBlankInput,
  newApartment,
  newPerson,
  sortApartments,
  validateApartment,
  type ApartmentInput,
} from '@/features/admin/apartmentsLogic';
import type { Apartment } from '@/shared/types/domain';

const filled: ApartmentInput = {
  scara: 'B',
  etaj: '2',
  numar_apartament: '9',
  suprafata_utila: '63,8',
  cota_parte_indiviza: '4,8',
  numar_persoane: '3',
  proprietar_principal_name: 'Popescu Andrei',
  notes: 'colt',
};

describe('apartmentsLogic — grid + inputs', () => {
  it('blankGridRows generates the requested count, clamped to [0, 500]', () => {
    expect(blankGridRows(0)).toHaveLength(0);
    expect(blankGridRows(6)).toHaveLength(6);
    expect(blankGridRows(-3)).toHaveLength(0);
    expect(blankGridRows(9999)).toHaveLength(500);
    expect(blankGridRows(3)[0]).toEqual(blankApartmentInput());
  });

  it('isBlankInput is true only for an untouched row', () => {
    expect(isBlankInput(blankApartmentInput())).toBe(true);
    expect(isBlankInput({ ...blankApartmentInput(), scara: 'A' })).toBe(false);
    expect(isBlankInput(filled)).toBe(false);
  });
});

describe('apartmentsLogic — validation', () => {
  it('requires numar_apartament and nothing else by default', () => {
    expect(validateApartment(blankApartmentInput())).toEqual({ numar_apartament: 'required' });
    expect(validateApartment(filled)).toEqual({});
  });

  it('rejects an out-of-range cota-parte and a non-integer floor', () => {
    expect(validateApartment({ ...filled, cota_parte_indiviza: '120' })).toHaveProperty(
      'cota_parte_indiviza',
    );
    expect(validateApartment({ ...filled, cota_parte_indiviza: 'abc' })).toHaveProperty(
      'cota_parte_indiviza',
    );
    expect(validateApartment({ ...filled, etaj: '2.5' })).toHaveProperty('etaj');
    expect(validateApartment({ ...filled, suprafata_utila: '-1' })).toHaveProperty(
      'suprafata_utila',
    );
    expect(validateApartment({ ...filled, numar_persoane: '-2' })).toHaveProperty('numar_persoane');
  });
});

describe('apartmentsLogic — newApartment', () => {
  it('parses fields, converts the cota percent to a share and trims strings', () => {
    const a = newApartment(filled, 'asoc-1');
    expect(a.asociatie_id).toBe('asoc-1');
    expect(a.scara).toBe('B');
    expect(a.etaj).toBe(2);
    expect(a.numar_apartament).toBe('9');
    expect(a.suprafata_utila).toBeCloseTo(63.8);
    // 4,8% is stored as the indivisible share 0.048.
    expect(a.cota_parte_indiviza).toBeCloseTo(0.048);
    expect(a.numar_persoane).toBe(3);
    expect(a.proprietar_principal_name).toBe('Popescu Andrei');
    expect(a.is_active).toBe(true);
    expect(a.id).toMatch(/^ap-/);
  });

  it('nulls out blank optional fields', () => {
    const a = newApartment({ ...blankApartmentInput(), numar_apartament: '1' }, 'asoc-1');
    expect(a.scara).toBeNull();
    expect(a.etaj).toBeNull();
    expect(a.suprafata_utila).toBeNull();
    expect(a.cota_parte_indiviza).toBeNull();
    expect(a.proprietar_principal_name).toBeNull();
    expect(a.notes).toBeNull();
  });

  it('defaults numar_persoane from the person list when the count is blank', () => {
    const persons = [newPerson('proprietar'), newPerson('locator')].map((p, i) => ({
      ...p,
      name: `P${i}`,
    }));
    const a = newApartment(
      { ...blankApartmentInput(), numar_apartament: '1' },
      'asoc-1',
      persons,
    );
    expect(a.persons).toHaveLength(2);
    expect(a.numar_persoane).toBe(2);
  });

  it('keeps an explicit count over the person-list length and drops unnamed persons', () => {
    const persons = [
      { ...newPerson('proprietar'), name: 'Named' },
      { ...newPerson('locator'), name: '  ' },
    ];
    const a = newApartment({ ...filled, numar_persoane: '5' }, 'asoc-1', persons);
    expect(a.numar_persoane).toBe(5);
    expect(a.persons).toHaveLength(1);
    expect(a.persons[0].name).toBe('Named');
  });
});

describe('apartmentsLogic — round trip + edit', () => {
  const base: Apartment = {
    id: 'ap-x',
    asociatie_id: 'asoc-1',
    scara: 'A',
    etaj: 0,
    numar_apartament: '1',
    suprafata_utila: 54.2,
    cota_parte_indiviza: 0.041,
    numar_persoane: 2,
    persons: [{ id: 'pe-1', name: 'Ionescu Maria', role: 'proprietar', is_primary: true }],
    proprietar_principal_name: 'Ionescu Maria',
    is_active: true,
    notes: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  it('apartmentToInput shows the share as a percent and floor as a string', () => {
    const input = apartmentToInput(base);
    expect(input.cota_parte_indiviza).toBe('4.1');
    expect(input.etaj).toBe('0');
    expect(input.numar_apartament).toBe('1');
  });

  it('applyApartmentEdit preserves identity but updates fields and timestamp', () => {
    const input = apartmentToInput(base);
    const edited = applyApartmentEdit(
      base,
      { ...input, proprietar_principal_name: 'Ionescu Radu' },
      base.persons,
    );
    expect(edited.id).toBe(base.id);
    expect(edited.created_at).toBe(base.created_at);
    expect(edited.proprietar_principal_name).toBe('Ionescu Radu');
    expect(edited.cota_parte_indiviza).toBeCloseTo(0.041);
    expect(edited.updated_at).not.toBe(base.updated_at);
  });

  it('sortApartments orders by scara, then floor, then numeric number', () => {
    const make = (scara: string, etaj: number, n: string): Apartment => ({
      ...base,
      id: `ap-${scara}${etaj}${n}`,
      scara,
      etaj,
      numar_apartament: n,
    });
    const sorted = sortApartments([
      make('B', 1, '20'),
      make('A', 2, '9'),
      make('A', 2, '10'),
      make('A', 0, '1'),
    ]);
    expect(sorted.map((a) => a.id)).toEqual(['ap-A01', 'ap-A29', 'ap-A210', 'ap-B120']);
  });
});

describe('apartmentsLogic — newPerson', () => {
  it('creates a blank, non-primary person with the given role and a unique id', () => {
    const p = newPerson('chirias');
    expect(p.name).toBe('');
    expect(p.role).toBe('chirias');
    expect(p.is_primary).toBe(false);
    expect(p.id).toMatch(/^pe-/);
    expect(newPerson().id).not.toBe(p.id);
  });
});
