import { describe, expect, it } from 'vitest';
import {
  isValidContact,
  isValidPassphrase,
  isValidPhone,
  phoneDigits,
  sortContacts,
  telHref,
} from '@/features/safety/safetyLogic';
import type { TrustedContact } from '@/shared/types/domain';

const contact = (id: string, name: string): TrustedContact => ({
  id,
  name,
  relationship: 'vecin',
  phone: '+40 740 000 000',
});

describe('isValidPassphrase', () => {
  it('requires at least 3 visible characters', () => {
    expect(isValidPassphrase('Castanul din curte')).toBe(true);
    expect(isValidPassphrase('ab')).toBe(false);
    expect(isValidPassphrase('   ')).toBe(false);
  });
});

describe('phoneDigits', () => {
  it('strips everything but digits', () => {
    expect(phoneDigits('+40 740 123 456')).toBe('40740123456');
    expect(phoneDigits('(021) 555-1234')).toBe('0215551234');
  });
});

describe('isValidPhone', () => {
  it('needs at least 6 digits', () => {
    expect(isValidPhone('+40 740 123 456')).toBe(true);
    expect(isValidPhone('12 34')).toBe(false);
  });
});

describe('isValidContact', () => {
  it('requires a 2+ char name and a valid phone', () => {
    expect(isValidContact('Mihai', '+40 740 123 456')).toBe(true);
    expect(isValidContact('M', '+40 740 123 456')).toBe(false);
    expect(isValidContact('Mihai', '123')).toBe(false);
  });
});

describe('telHref', () => {
  it('keeps a leading + and strips the rest', () => {
    expect(telHref('+40 740 123 456')).toBe('tel:+40740123456');
    expect(telHref('021 555 1234')).toBe('tel:0215551234');
  });
});

describe('sortContacts', () => {
  it('orders by name, diacritic-insensitive, without mutating', () => {
    const input = [contact('1', 'Zoe'), contact('2', 'Ana'), contact('3', 'Élodie')];
    const sorted = sortContacts(input);
    expect(sorted.map((c) => c.name)).toEqual(['Ana', 'Élodie', 'Zoe']);
    expect(input[0].name).toBe('Zoe');
  });
});
