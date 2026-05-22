import type { TrustedContact } from '@/shared/types/domain';

/** A passphrase is meaningful once it is at least 3 visible characters. */
export function isValidPassphrase(passphrase: string): boolean {
  return passphrase.trim().length >= 3;
}

/** Digits only, ignoring spaces, dashes, parentheses and a leading "+". */
export function phoneDigits(phone: string): string {
  return phone.replace(/[^\d]/g, '');
}

/** A phone is acceptable with at least 6 digits (lenient — formats vary). */
export function isValidPhone(phone: string): boolean {
  return phoneDigits(phone).length >= 6;
}

/** A trusted contact needs a 2+ char name and a valid phone. */
export function isValidContact(name: string, phone: string): boolean {
  return name.trim().length >= 2 && isValidPhone(phone);
}

/** `tel:` href target: a leading "+" is preserved, everything else stripped. */
export function telHref(phone: string): string {
  const plus = phone.trim().startsWith('+') ? '+' : '';
  return `tel:${plus}${phoneDigits(phone)}`;
}

/** Contacts sorted by name (diacritic-insensitive), stable. */
export function sortContacts(contacts: TrustedContact[]): TrustedContact[] {
  return [...contacts].sort((a, b) =>
    a.name.localeCompare(b.name, 'ro', { sensitivity: 'base' }),
  );
}
