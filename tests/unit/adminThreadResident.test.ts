/**
 * T130: Link admin-initiated F04 threads to the resident's account.
 *
 * Verifies that pickAdminThreadResident resolves the auth-uid of an
 * account-linked occupant for an admin-initiated private thread, so the
 * conversation reaches the right inbox under the party-or-admin RLS.
 */

import { describe, expect, it } from 'vitest';
import {
  apartmentHasLinkedResident,
  pickAdminThreadResident,
} from '@/features/admin/apartmentsLogic';
import type { Apartment, ApartmentPerson } from '@/shared/types/domain';

function person(overrides: Partial<ApartmentPerson> = {}): ApartmentPerson {
  return {
    id: `pe-${Math.random().toString(36).slice(2)}`,
    name: 'Popescu Ion',
    role: 'proprietar',
    is_primary: false,
    email: null,
    ...overrides,
  };
}

function apartment(persons: ApartmentPerson[]): Apartment {
  return {
    id: 'ap-test',
    asociatie_id: 'asoc-test',
    scara: null,
    etaj: null,
    numar_apartament: '1',
    suprafata_utila: null,
    cota_parte_indiviza: null,
    numar_persoane: persons.length,
    persons,
    proprietar_principal_name: null,
    is_active: true,
    notes: null,
    created_at: '',
    updated_at: '',
  };
}

describe('pickAdminThreadResident', () => {
  it('returns null when the persons list is empty', () => {
    expect(pickAdminThreadResident(apartment([]))).toBeNull();
  });

  it('prefers the primary person when they are account-linked', () => {
    const result = pickAdminThreadResident(
      apartment([
        person({ id: 'pe-a', name: 'Primary', is_primary: true, claimed_user_id: 'u-primary' }),
        person({ id: 'pe-b', name: 'Other', is_primary: false, claimed_user_id: 'u-other' }),
      ]),
    );
    expect(result).toEqual({ userId: 'u-primary', name: 'Primary', pending: false });
  });

  it('falls back to any claimed person when the primary is not linked', () => {
    const result = pickAdminThreadResident(
      apartment([
        person({ id: 'pe-a', name: 'Primary', is_primary: true }),
        person({ id: 'pe-b', name: 'Other', is_primary: false, claimed_user_id: 'u-other' }),
      ]),
    );
    expect(result).toEqual({ userId: 'u-other', name: 'Other', pending: false });
  });

  it('flags pending and uses the primary person id when nobody is linked yet', () => {
    const result = pickAdminThreadResident(
      apartment([
        person({ id: 'pe-a', name: 'Primary', is_primary: true }),
        person({ id: 'pe-b', name: 'Other', is_primary: false }),
      ]),
    );
    expect(result).toEqual({ userId: 'pe-a', name: 'Primary', pending: true });
  });

  it('falls back to the first person when none is marked primary', () => {
    const result = pickAdminThreadResident(
      apartment([
        person({ id: 'pe-a', name: 'First', is_primary: false }),
        person({ id: 'pe-b', name: 'Second', is_primary: false, claimed_user_id: 'u-second' }),
      ]),
    );
    // Primary defaults to the first entry; that one is unclaimed, but a later
    // claimed entry wins the fallback.
    expect(result).toEqual({ userId: 'u-second', name: 'Second', pending: false });
  });

  it('treats null claimed_user_id as unclaimed', () => {
    const result = pickAdminThreadResident(
      apartment([
        person({ id: 'pe-a', name: 'Primary', is_primary: true, claimed_user_id: null }),
      ]),
    );
    expect(result?.pending).toBe(true);
    expect(result?.userId).toBe('pe-a');
  });

  it('uses the person id as a fallback display name when name is empty', () => {
    const result = pickAdminThreadResident(
      apartment([person({ id: 'pe-a', name: '', is_primary: true, claimed_user_id: 'u-a' })]),
    );
    expect(result?.name).toBe('pe-a');
  });
});

describe('apartmentHasLinkedResident', () => {
  it('is false when no person is account-linked', () => {
    expect(
      apartmentHasLinkedResident(
        apartment([person({ name: 'A' }), person({ name: 'B' })]),
      ),
    ).toBe(false);
  });

  it('is true when any person has a claimed_user_id', () => {
    expect(
      apartmentHasLinkedResident(
        apartment([person({ name: 'A' }), person({ name: 'B', claimed_user_id: 'u-b' })]),
      ),
    ).toBe(true);
  });

  it('is false for an empty persons list', () => {
    expect(apartmentHasLinkedResident(apartment([]))).toBe(false);
  });
});
