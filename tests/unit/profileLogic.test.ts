import { describe, expect, it } from 'vitest';
import {
  AVATAR_MAX_DIM,
  CUSTOM_FIELD_TYPES,
  addCustomField,
  avatarThumbDim,
  canViewAnyProfile,
  completeness,
  emptyProfile,
  firstName,
  hasValidationErrors,
  initials,
  seedProfile,
  isAcceptedImageType,
  moveCustomField,
  neighbourVisibleFields,
  newCustomField,
  normalizePlate,
  reorderCustomField,
  removeCustomField,
  sortedCustomFields,
  squareCropRect,
  updateCustomField,
  validateCustomFieldValue,
  validateDate,
  validateEmail,
  validateLink,
  validateNumber,
  validatePhone,
  validatePlate,
  validateStandard,
  type ProfileData,
} from '@/features/profile/profileLogic';

// F66 Profil complet — the model, validation, completeness and custom-field
// operations are all pure, so the editor's correctness is locked in without a
// DOM or a backend. The page only wires React state + canvas onto these.

function filledProfile(): ProfileData {
  return {
    ...emptyProfile('u-1', 'a@b.ro'),
    fullName: 'Popescu Andrei',
    displayName: 'Andrei',
    phone: '+40 721 234 567',
    avatarDataUrl: 'data:image/jpeg;base64,xxx',
    apartmentId: 'ap-2',
    carPlate: 'B 123 ABC',
    address: 'Str. Teilor 12',
    emergencyContact: { name: 'Maria', phone: '0722000000', relationship: 'soră' },
    dateOfBirth: '1988-04-12',
  };
}

describe('firstName', () => {
  it('returns the first whitespace-delimited token', () => {
    expect(firstName('Popescu Andrei')).toBe('Popescu');
    expect(firstName('  Ioana   Maria ')).toBe('Ioana');
  });
  it('returns an empty string for a blank name', () => {
    expect(firstName('   ')).toBe('');
  });
});

describe('seedProfile', () => {
  it('seeds the full name + email and derives the display name from the first token', () => {
    const p = seedProfile('u-9', 'nou@vecini.online', '  Ștefan-Andrei Mureșan ');
    expect(p.userId).toBe('u-9');
    expect(p.email).toBe('nou@vecini.online');
    expect(p.fullName).toBe('Ștefan-Andrei Mureșan');
    expect(p.displayName).toBe('Ștefan-Andrei');
  });

  it('leaves every other field at its empty default', () => {
    const p = seedProfile('u-9', 'nou@vecini.online', 'Ana');
    expect(p.phone).toBe('');
    expect(p.avatarDataUrl).toBeNull();
    expect(p.apartmentId).toBeNull();
    expect(p.customFields).toEqual([]);
    expect(hasValidationErrors(p)).toBe(false);
  });

  it('defaults locale to ro when no locale is passed', () => {
    const p = seedProfile('u-9', 'a@b.com', 'Ana');
    expect(p.locale).toBe('ro');
  });

  it('uses the provided locale when passed', () => {
    const p = seedProfile('u-9', 'a@b.com', 'Ana', 'en');
    expect(p.locale).toBe('en');
  });
});

describe('initials', () => {
  it('takes the first letter of the first two name parts, uppercased', () => {
    expect(initials('Popescu Andrei')).toBe('PA');
    expect(initials('andrei')).toBe('A');
    expect(initials('  Ion  Vasile  Gheorghe ')).toBe('IV');
  });

  it('falls back to ? for an empty name', () => {
    expect(initials('')).toBe('?');
    expect(initials('   ')).toBe('?');
  });
});

describe('per-type validation', () => {
  it('treats blank optional values as acceptable', () => {
    expect(validateEmail('')).toBeNull();
    expect(validatePhone('  ')).toBeNull();
    expect(validatePlate('')).toBeNull();
    expect(validateDate('')).toBeNull();
    expect(validateNumber('')).toBeNull();
    expect(validateLink('')).toBeNull();
  });

  it('validates email', () => {
    expect(validateEmail('a@b.ro')).toBeNull();
    expect(validateEmail('not-an-email')).toBe('invalidEmail');
  });

  it('validates phone (digits, optional separators)', () => {
    expect(validatePhone('+40 721 234 567')).toBeNull();
    expect(validatePhone('0722-000-000')).toBeNull();
    expect(validatePhone('12')).toBe('invalidPhone');
    expect(validatePhone('not a phone')).toBe('invalidPhone');
  });

  it('validates Romanian plates (Bucharest + counties)', () => {
    expect(validatePlate('B 123 ABC')).toBeNull();
    expect(validatePlate('CJ 12 XYZ')).toBeNull();
    expect(validatePlate('b12abc')).toBeNull();
    expect(validatePlate('XYZ')).toBe('invalidPlate');
    expect(normalizePlate('cj 12 xyz')).toBe('CJ12XYZ');
  });

  it('validates dates and rejects future ones', () => {
    const now = new Date('2026-05-23T00:00:00Z');
    expect(validateDate('1990-01-01', now)).toBeNull();
    expect(validateDate('2030-01-01', now)).toBe('futureDate');
    expect(validateDate('not-a-date', now)).toBe('invalidDate');
  });

  it('validates numbers and links', () => {
    expect(validateNumber('42')).toBeNull();
    expect(validateNumber('-3.5')).toBeNull();
    expect(validateNumber('abc')).toBe('invalidNumber');
    expect(validateLink('https://example.com')).toBeNull();
    expect(validateLink('example.com')).toBe('invalidLink');
  });

  it('routes a custom field to the validator for its type', () => {
    expect(validateCustomFieldValue('email', 'bad')).toBe('invalidEmail');
    expect(validateCustomFieldValue('phone', '12')).toBe('invalidPhone');
    expect(validateCustomFieldValue('number', 'x')).toBe('invalidNumber');
    expect(validateCustomFieldValue('link', 'x')).toBe('invalidLink');
    // free-form types never reject a value
    expect(validateCustomFieldValue('text', 'anything')).toBeNull();
    expect(validateCustomFieldValue('longtext', 'anything')).toBeNull();
    expect(validateCustomFieldValue('select', 'opt')).toBeNull();
    expect(validateCustomFieldValue('bool', 'true')).toBeNull();
    expect(validateCustomFieldValue('address', 'anywhere')).toBeNull();
  });

  it('aggregates the standard-field errors', () => {
    const bad: ProfileData = {
      ...emptyProfile('u-1', 'broken-email'),
      phone: '12',
      carPlate: 'ZZZ',
      dateOfBirth: '3000-01-01',
      emergencyContact: { name: '', phone: 'nope', relationship: '' },
    };
    const errors = validateStandard(bad);
    expect(errors.email).toBe('invalidEmail');
    expect(errors.phone).toBe('invalidPhone');
    expect(errors.carPlate).toBe('invalidPlate');
    expect(errors.dateOfBirth).toBe('futureDate');
    expect(errors.emergencyPhone).toBe('invalidPhone');
    expect(hasValidationErrors(bad)).toBe(true);
    expect(hasValidationErrors(filledProfile())).toBe(false);
  });
});

describe('completeness', () => {
  it('is 0 for an empty profile and 100 for a fully filled one', () => {
    expect(completeness(emptyProfile('u-1', ''))).toBe(0);
    expect(completeness(filledProfile())).toBe(100);
  });

  it('rises as more standard fields are filled', () => {
    const partial = { ...emptyProfile('u-1', 'a@b.ro'), fullName: 'X' };
    const pct = completeness(partial);
    expect(pct).toBeGreaterThan(0);
    expect(pct).toBeLessThan(100);
  });
});

describe('custom-field operations (pure, non-mutating)', () => {
  it('adds, updates and removes fields without mutating the input', () => {
    const fields: ProfileData['customFields'] = [];
    const f = newCustomField('Hobby', 'text', 'neighbours', fields, 'cf-1');
    const added = addCustomField(fields, f);
    expect(fields).toHaveLength(0); // original untouched
    expect(added).toHaveLength(1);
    expect(added[0]).toMatchObject({ id: 'cf-1', label: 'Hobby', type: 'text', sortOrder: 0 });

    const updated = updateCustomField(added, 'cf-1', { value: 'șah' });
    expect(updated[0].value).toBe('șah');
    expect(added[0].value).toBe(''); // original untouched

    expect(removeCustomField(updated, 'cf-1')).toHaveLength(0);
  });

  it('trims the label and select options when creating a field', () => {
    const f = newCustomField('  Etaj preferat  ', 'select', 'private', [], 'cf-9', [
      ' parter ',
      '',
      ' 1 ',
    ]);
    expect(f.label).toBe('Etaj preferat');
    expect(f.options).toEqual(['parter', '1']);
  });

  it('assigns the next sort order and reorders with move', () => {
    let fields: ProfileData['customFields'] = [];
    fields = addCustomField(fields, newCustomField('A', 'text', 'private', fields, 'a'));
    fields = addCustomField(fields, newCustomField('B', 'text', 'private', fields, 'b'));
    fields = addCustomField(fields, newCustomField('C', 'text', 'private', fields, 'c'));
    expect(sortedCustomFields(fields).map((f) => f.id)).toEqual(['a', 'b', 'c']);

    const movedUp = moveCustomField(fields, 'c', 'up');
    expect(sortedCustomFields(movedUp).map((f) => f.id)).toEqual(['a', 'c', 'b']);

    // moving the top field up is a no-op (returns the input unchanged)
    expect(moveCustomField(fields, 'a', 'up')).toBe(fields);
    // unknown id is a no-op
    expect(moveCustomField(fields, 'zzz', 'down')).toBe(fields);
  });

  it('reorderCustomField moves a field to an arbitrary index', () => {
    let fields: ProfileData['customFields'] = [];
    fields = addCustomField(fields, newCustomField('A', 'text', 'private', fields, 'a'));
    fields = addCustomField(fields, newCustomField('B', 'text', 'private', fields, 'b'));
    fields = addCustomField(fields, newCustomField('C', 'text', 'private', fields, 'c'));
    fields = addCustomField(fields, newCustomField('D', 'text', 'private', fields, 'd'));
    const ids = (f: ProfileData['customFields']) => sortedCustomFields(f).map((x) => x.id);

    expect(ids(reorderCustomField(fields, 'a', 3))).toEqual(['b', 'c', 'd', 'a']);
    expect(ids(reorderCustomField(fields, 'd', 0))).toEqual(['d', 'a', 'b', 'c']);
    expect(ids(reorderCustomField(fields, 'b', 2))).toEqual(['a', 'c', 'b', 'd']);
    // same position: no-op (same reference)
    expect(reorderCustomField(fields, 'b', 1)).toBe(fields);
    // unknown id: no-op
    expect(reorderCustomField(fields, 'zzz', 0)).toBe(fields);
    // out-of-bounds clamps to last
    expect(ids(reorderCustomField(fields, 'a', 99))).toEqual(['b', 'c', 'd', 'a']);
  });

  it('exposes only filled, neighbour-visible fields for the directory', () => {
    let fields: ProfileData['customFields'] = [];
    fields = addCustomField(fields, newCustomField('Vizibil', 'text', 'neighbours', fields, 'v'));
    fields = addCustomField(fields, newCustomField('Gol', 'text', 'neighbours', fields, 'g'));
    fields = addCustomField(fields, newCustomField('Privat', 'text', 'private', fields, 'p'));
    fields = updateCustomField(fields, 'v', { value: 'da' });
    fields = updateCustomField(fields, 'p', { value: 'secret' });
    const visible = neighbourVisibleFields(fields);
    expect(visible.map((f) => f.id)).toEqual(['v']);
  });

  it('exports a stable typed catalog', () => {
    expect(CUSTOM_FIELD_TYPES).toHaveLength(10);
    expect(new Set(CUSTOM_FIELD_TYPES).size).toBe(10);
  });
});

describe('avatar crop maths', () => {
  it('accepts only image MIME types', () => {
    expect(isAcceptedImageType('image/png')).toBe(true);
    expect(isAcceptedImageType('image/jpeg')).toBe(true);
    expect(isAcceptedImageType('image/webp')).toBe(true);
    expect(isAcceptedImageType('application/pdf')).toBe(false);
    expect(isAcceptedImageType('text/plain')).toBe(false);
  });

  it('centers a square crop on the shorter edge', () => {
    expect(squareCropRect(400, 300)).toEqual({ sx: 50, sy: 0, size: 300 });
    expect(squareCropRect(300, 400)).toEqual({ sx: 0, sy: 50, size: 300 });
    expect(squareCropRect(200, 200)).toEqual({ sx: 0, sy: 0, size: 200 });
  });

  it('caps the thumbnail dimension', () => {
    expect(avatarThumbDim(1000)).toBe(AVATAR_MAX_DIM);
    expect(avatarThumbDim(120)).toBe(120);
    expect(avatarThumbDim(0)).toBe(1);
  });
});

describe('canViewAnyProfile', () => {
  it('allows admin, presedinte, comitet, cenzor, super_admin', () => {
    expect(canViewAnyProfile('admin')).toBe(true);
    expect(canViewAnyProfile('presedinte')).toBe(true);
    expect(canViewAnyProfile('comitet')).toBe(true);
    expect(canViewAnyProfile('cenzor')).toBe(true);
    expect(canViewAnyProfile('super_admin')).toBe(true);
  });
  it('denies proprietar, locatar, and null', () => {
    expect(canViewAnyProfile('proprietar')).toBe(false);
    expect(canViewAnyProfile('locatar')).toBe(false);
    expect(canViewAnyProfile(null)).toBe(false);
  });
});
