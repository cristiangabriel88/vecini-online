import { beforeEach, describe, expect, it } from 'vitest';
import {
  blankProvisionInput,
  daysSince,
  DORMANT_AFTER_DAYS,
  isDormant,
  isValidCui,
  isValidIban,
  isValidPhone,
  newPlatformAsociatieId,
  normalizeIban,
  provisionAsociatie,
  sortAsociatii,
  validateProvisionInput,
  type ProvisionInput,
} from '@/platform/platformProvisioningLogic';
import { usePlatformAsociatiiStore } from '@/platform/platformAsociatiiStore';
import { useAuditStore } from '@/shared/store/auditStore';
import { DEMO_PLATFORM_ASOCIATII, type PlatformAsociatieSummary } from '@/platform/demoPlatform';

// T94 — superadmin console: asociații + admin provisioning. The provisioning
// shape is pure so the offline path is exhaustively testable without a backend;
// the privileged live write is the T92 service-role function, not exercised here.

const validInput: ProvisionInput = {
  asociatieName: 'Asociația Test Bloc 1',
  city: 'Brașov',
  address: 'Str. Lungă nr. 4, Brașov',
  cui: '12345678',
  registrationNumber: '4521/2019',
  iban: 'RO49AAAA1B31007593840000',
  contactPhone: '+40 21 555 0123',
  contactEmail: 'contact@exemplu.ro',
  adminName: 'Ionescu Maria',
  adminEmail: 'maria@exemplu.ro',
};

describe('validateProvisionInput (T94/T122)', () => {
  it('accepts a complete request and returns the trimmed, normalised value', () => {
    const { errors, value } = validateProvisionInput({
      asociatieName: '  Asociația Test Bloc 1  ',
      city: ' Brașov ',
      address: ' Str. Lungă nr. 4, Brașov ',
      cui: ' 12345678 ',
      registrationNumber: ' 4521/2019 ',
      iban: ' ro49 aaaa 1b31 0075 9384 0000 ',
      contactPhone: ' +40 21 555 0123 ',
      contactEmail: ' contact@exemplu.ro ',
      adminName: ' Ionescu Maria ',
      adminEmail: ' maria@exemplu.ro ',
    });
    expect(errors).toEqual({});
    expect(value).toEqual(validInput); // IBAN upper-cased and de-spaced
  });

  it('flags every required core field but leaves the optional identity blank', () => {
    const { errors, value } = validateProvisionInput(blankProvisionInput());
    expect(errors).toEqual({
      asociatieName: 'required',
      city: 'required',
      adminName: 'required',
      adminEmail: 'required',
    });
    expect(value).toBeNull();
  });

  it('accepts a request with the identity fields left empty', () => {
    const { errors, value } = validateProvisionInput({
      ...blankProvisionInput(),
      asociatieName: 'Asociația Test Bloc 1',
      city: 'Brașov',
      adminName: 'Ionescu Maria',
      adminEmail: 'maria@exemplu.ro',
    });
    expect(errors).toEqual({});
    expect(value).toMatchObject({ address: '', cui: '', iban: '', contactPhone: '', contactEmail: '' });
  });

  it('flags too-short names and an invalid email', () => {
    const { errors } = validateProvisionInput({
      ...blankProvisionInput(),
      asociatieName: 'AB',
      city: 'B',
      adminName: 'I',
      adminEmail: 'not-an-email',
    });
    expect(errors.asociatieName).toBe('tooShort');
    expect(errors.city).toBe('tooShort');
    expect(errors.adminName).toBe('tooShort');
    expect(errors.adminEmail).toBe('email');
  });

  it('flags a malformed CUI, IBAN, phone and contact email when filled', () => {
    const { errors, value } = validateProvisionInput({
      ...blankProvisionInput(),
      asociatieName: 'Asociația Test Bloc 1',
      city: 'Brașov',
      adminName: 'Ionescu Maria',
      adminEmail: 'maria@exemplu.ro',
      cui: 'AB12',
      iban: 'RO00',
      contactPhone: 'abc',
      contactEmail: 'nope',
    });
    expect(errors.cui).toBe('cui');
    expect(errors.iban).toBe('iban');
    expect(errors.contactPhone).toBe('phone');
    expect(errors.contactEmail).toBe('email');
    expect(value).toBeNull();
  });
});

describe('identity field validators (T122)', () => {
  it('normalises and validates IBANs', () => {
    expect(normalizeIban(' ro49 aaaa 1b31 0075 9384 0000 ')).toBe('RO49AAAA1B31007593840000');
    expect(isValidIban('RO49 AAAA 1B31 0075 9384 0000')).toBe(true);
    expect(isValidIban('RO00')).toBe(false);
    expect(isValidIban('1234567890123456')).toBe(false);
  });

  it('validates Romanian fiscal codes', () => {
    expect(isValidCui('12345678')).toBe(true);
    expect(isValidCui('RO12345678')).toBe(true);
    expect(isValidCui('AB12')).toBe(false);
    expect(isValidCui('1')).toBe(false);
  });

  it('validates contact phone numbers', () => {
    expect(isValidPhone('+40 21 555 0123')).toBe(true);
    expect(isValidPhone('0212223344')).toBe(true);
    expect(isValidPhone('123')).toBe(false);
    expect(isValidPhone('abc')).toBe(false);
  });
});

describe('provisionAsociatie (T94)', () => {
  it('builds a fresh asociație with zero members/apartments and no admin sign-in', () => {
    const { asociatie, admin } = provisionAsociatie(validInput);
    expect(asociatie.id).toMatch(/^platform-asoc-/);
    expect(asociatie.name).toBe(validInput.asociatieName);
    expect(asociatie.city).toBe(validInput.city);
    expect(asociatie.members).toBe(0);
    expect(asociatie.apartments).toBe(0);
    expect(asociatie.lastAdminSignInAt).toBeNull();
    expect(admin.name).toBe(validInput.adminName);
    expect(admin.email).toBe(validInput.adminEmail);
    expect(admin.setupCode).toMatch(/^[A-Z2-9]{8}$/);
  });

  it('carries the asociație identity onto the summary', () => {
    const { asociatie } = provisionAsociatie(validInput);
    expect(asociatie.address).toBe(validInput.address);
    expect(asociatie.cui).toBe(validInput.cui);
    expect(asociatie.registrationNumber).toBe(validInput.registrationNumber);
    expect(asociatie.iban).toBe(validInput.iban);
    expect(asociatie.contactPhone).toBe(validInput.contactPhone);
    expect(asociatie.contactEmail).toBe(validInput.contactEmail);
  });

  it('regenerates the setup code when it collides with an existing one', () => {
    // rng yields 0 for the first 8 chars ("AAAAAAAA"), then a value mapping to
    // index 1 ("BBBBBBBB"), so the colliding first code is replaced.
    let n = 0;
    const rng = () => (n++ < 8 ? 0 : 0.04);
    const { admin } = provisionAsociatie(validInput, ['AAAAAAAA'], rng);
    expect(admin.setupCode).not.toBe('AAAAAAAA');
    expect(admin.setupCode).toMatch(/^[A-Z2-9]{8}$/);
  });

  it('mints a distinct id on every call', () => {
    expect(newPlatformAsociatieId()).not.toBe(newPlatformAsociatieId());
  });
});

describe('sortAsociatii (T94)', () => {
  it('orders by display name without mutating the input', () => {
    const rows: PlatformAsociatieSummary[] = [
      { id: 'b', name: 'Zarea', city: 'X', members: 1, apartments: 1, lastAdminSignInAt: null },
      { id: 'a', name: 'Avram', city: 'Y', members: 1, apartments: 1, lastAdminSignInAt: null },
    ];
    const sorted = sortAsociatii(rows);
    expect(sorted.map((r) => r.name)).toEqual(['Avram', 'Zarea']);
    expect(rows[0].name).toBe('Zarea'); // input untouched
  });
});

describe('dormant signal (T94)', () => {
  const now = new Date('2026-05-25T12:00:00Z');

  it('treats a never-signed-in asociație as dormant', () => {
    expect(daysSince(null, now)).toBeNull();
    expect(isDormant(null, now)).toBe(true);
  });

  it('is active within the window and dormant past it', () => {
    const recent = new Date(now.getTime() - 2 * 86_400_000).toISOString();
    const stale = new Date(now.getTime() - (DORMANT_AFTER_DAYS + 1) * 86_400_000).toISOString();
    expect(isDormant(recent, now)).toBe(false);
    expect(isDormant(stale, now)).toBe(true);
  });
});

describe('platformAsociatiiStore.provision (T94)', () => {
  beforeEach(() => {
    usePlatformAsociatiiStore.setState({
      asociatii: sortAsociatii(DEMO_PLATFORM_ASOCIATII),
      provisions: {},
    });
  });

  it('seeds the demo platform asociații', () => {
    expect(usePlatformAsociatiiStore.getState().asociatii).toHaveLength(
      DEMO_PLATFORM_ASOCIATII.length,
    );
  });

  it('adds a provisioned asociație, keeps the list sorted, and records the admin', () => {
    const before = usePlatformAsociatiiStore.getState().asociatii.length;
    const result = usePlatformAsociatiiStore.getState().provision(validInput);

    const state = usePlatformAsociatiiStore.getState();
    expect(state.asociatii).toHaveLength(before + 1);
    // list stays name-sorted
    const names = state.asociatii.map((a) => a.name);
    expect([...names]).toEqual([...names].sort((a, b) => a.localeCompare(b, 'ro')));

    const prov = state.provisions[result.asociatie.id];
    expect(prov).toBeTruthy();
    expect(prov.email).toBe(validInput.adminEmail);
    expect(prov.setupCode).toBe(result.admin.setupCode);
  });

  it('audits the provisioning as the genesis of the new asociație chain', () => {
    const result = usePlatformAsociatiiStore.getState().provision(validInput);
    const chain = useAuditStore.getState().forAsociatie(result.asociatie.id);
    expect(chain).toHaveLength(2);
    expect(chain.map((e) => e.action)).toEqual([
      'asociatie.provisioned',
      'admin.provisioned',
    ]);
    expect(chain[0].entity_label).toBe(validInput.asociatieName);
    expect(chain[1].entity_label).toBe(validInput.adminEmail);
  });
});
