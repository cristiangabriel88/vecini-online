import { describe, expect, it } from 'vitest';
import {
  type BuildingIdentityForm,
  detectEntranceConfig,
  entranceInterval,
  entranceOptions,
  scariList,
  validateBuildingIdentity,
} from '@/features/admin/buildingLogic';

describe('buildingLogic — entrance options', () => {
  it('exposes 26 letters and 50 numbers', () => {
    expect(entranceOptions('letters')).toHaveLength(26);
    expect(entranceOptions('letters')[0]).toBe('A');
    expect(entranceOptions('numbers')).toHaveLength(50);
    expect(entranceOptions('numbers')[0]).toBe('1');
  });
});

describe('buildingLogic — entranceInterval', () => {
  it('returns the inclusive letter range', () => {
    expect(entranceInterval('letters', 'A', 'D')).toEqual(['A', 'B', 'C', 'D']);
    expect(entranceInterval('letters', 'C', 'C')).toEqual(['C']);
  });

  it('returns the inclusive number range', () => {
    expect(entranceInterval('numbers', '1', '4')).toEqual(['1', '2', '3', '4']);
  });

  it('tolerates a reversed pair by swapping', () => {
    expect(entranceInterval('letters', 'D', 'A')).toEqual(['A', 'B', 'C', 'D']);
  });

  it('returns an empty list for an unknown bound', () => {
    expect(entranceInterval('letters', 'A', '9')).toEqual([]);
    expect(entranceInterval('numbers', '1', 'Z')).toEqual([]);
  });
});

describe('buildingLogic — detectEntranceConfig', () => {
  it('defaults to a single A for an empty list', () => {
    expect(detectEntranceConfig([])).toEqual({ mode: 'letters', first: 'A', last: 'A' });
  });

  it('recovers a letter interval from the stored list', () => {
    expect(detectEntranceConfig(['A', 'B', 'C'])).toEqual({
      mode: 'letters',
      first: 'A',
      last: 'C',
    });
  });

  it('recovers a number interval only when every entry is numeric', () => {
    expect(detectEntranceConfig(['1', '2', '3'])).toEqual({
      mode: 'numbers',
      first: '1',
      last: '3',
    });
    // Mixed -> treated as letters; numeric entries are then unknown and dropped.
    expect(detectEntranceConfig(['A', '2']).mode).toBe('letters');
  });

  it('sorts by position so order in the stored list does not matter', () => {
    expect(detectEntranceConfig(['C', 'A', 'B'])).toEqual({
      mode: 'letters',
      first: 'A',
      last: 'C',
    });
  });
});

describe('buildingLogic — scariList', () => {
  it('reads a clean string list from the settings bag', () => {
    expect(scariList({ scari: ['A', 'B'] })).toEqual(['A', 'B']);
    expect(scariList({ scari: ['A', '', '  ', 'B'] })).toEqual(['A', 'B']);
  });

  it('returns an empty list for missing or non-array settings', () => {
    expect(scariList(undefined)).toEqual([]);
    expect(scariList({})).toEqual([]);
    expect(scariList({ scari: 'A,B' })).toEqual([]);
  });
});

describe('buildingLogic — validateBuildingIdentity (T131)', () => {
  const base: BuildingIdentityForm = {
    name: 'Asociația Bloc 12',
    address: 'Str. Florilor 3',
    cui: 'RO12345678',
    registration_number: 'J40/123/2020',
    iban: 'RO49 AAAA 1B31 0075 9384 0000',
    contact_phone: '+40 721 234 567',
    contact_email: 'contact@asoc.ro',
  };

  it('accepts a fully valid form and normalises the IBAN', () => {
    const { errors, value } = validateBuildingIdentity(base);
    expect(errors).toEqual({});
    expect(value).not.toBeNull();
    expect(value?.iban).toBe('RO49AAAA1B31007593840000');
    expect(value?.name).toBe('Asociația Bloc 12');
  });

  it('flags a missing name as required and a 2-char name as tooShort', () => {
    expect(validateBuildingIdentity({ ...base, name: '   ' }).errors.name).toBe('required');
    expect(validateBuildingIdentity({ ...base, name: 'AB' }).errors.name).toBe('tooShort');
  });

  it('accepts blank optional identity fields (only the name is mandatory)', () => {
    const { errors, value } = validateBuildingIdentity({
      name: 'Asociația Minimală',
      address: '',
      cui: '',
      registration_number: '',
      iban: '',
      contact_phone: '',
      contact_email: '',
    });
    expect(errors).toEqual({});
    expect(value?.iban).toBe('');
  });

  it('blocks a malformed IBAN, phone, CUI and contact email when filled', () => {
    const { errors, value } = validateBuildingIdentity({
      ...base,
      cui: 'not-a-cui',
      iban: 'GB00 NOPE',
      contact_phone: 'call-me',
      contact_email: 'nope',
    });
    expect(errors.cui).toBe('cui');
    expect(errors.iban).toBe('iban');
    expect(errors.contact_phone).toBe('phone');
    expect(errors.contact_email).toBe('email');
    expect(value).toBeNull();
  });

  it('trims values before persisting', () => {
    const { value } = validateBuildingIdentity({
      ...base,
      name: '  Asociația Bloc 12  ',
      contact_email: '  contact@asoc.ro  ',
    });
    expect(value?.name).toBe('Asociația Bloc 12');
    expect(value?.contact_email).toBe('contact@asoc.ro');
  });
});
