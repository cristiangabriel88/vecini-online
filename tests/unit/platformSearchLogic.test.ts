import { describe, expect, it } from 'vitest';
import { platformSearchResults } from '../../src/platform/platformSearchLogic';
import type { PlatformAsociatieSummary } from '../../src/platform/demoPlatform';
import type { AdminProvisionRecord, PendingAdminInvite } from '../../src/platform/platformAsociatiiStore';

const ASOC_TEILOR: PlatformAsociatieSummary = {
  id: 'asoc-1',
  name: 'Asociatia de Proprietari Bloc 12, Aleea Teilor',
  city: 'Bucuresti',
  members: 42,
  apartments: 36,
  lastAdminSignInAt: '2026-05-24T19:30:00Z',
  cui: '12345678',
  address: 'Str. Aleea Teilor nr. 12, Sector 4',
};

const ASOC_CRINULUI: PlatformAsociatieSummary = {
  id: 'asoc-2',
  name: 'Asociatia de Proprietari Bloc 7, Aleea Crinului',
  city: 'Cluj-Napoca',
  members: 28,
  apartments: 24,
  lastAdminSignInAt: '2026-05-22T08:10:00Z',
  cui: '23456789',
};

const ASOC_SUSPENDATA: PlatformAsociatieSummary = {
  id: 'asoc-3',
  name: 'Asociatia Mihai Viteazul',
  city: 'Timisoara',
  members: 16,
  apartments: 18,
  lastAdminSignInAt: null,
  status: 'suspended',
};

const PROVISION_TEILOR: AdminProvisionRecord = {
  asociatieId: 'asoc-1',
  name: 'Ion Popescu',
  email: 'ion.popescu@example.com',
  setupCode: 'ABC123',
  setupToken: 'tok-1',
  expiresAt: Date.now() + 86400000,
  redeemedAt: null,
  provisionedAt: '2026-01-01T10:00:00Z',
};

const PROVISION_REVOKED: AdminProvisionRecord = {
  asociatieId: 'asoc-2',
  name: 'Maria Ionescu',
  email: 'maria@example.com',
  setupCode: 'XYZ789',
  setupToken: 'tok-2',
  expiresAt: Date.now() + 86400000,
  redeemedAt: null,
  provisionedAt: '2026-02-01T10:00:00Z',
  revokedAt: Date.now() - 1000,
};

const EXTRA_ADMIN: AdminProvisionRecord = {
  asociatieId: 'asoc-1',
  name: 'Ana Georgescu',
  email: 'ana.georgescu@example.com',
  setupCode: 'DEF456',
  setupToken: 'tok-3',
  expiresAt: Date.now() + 86400000,
  redeemedAt: null,
  provisionedAt: '2026-03-01T10:00:00Z',
};

const PENDING_INVITE: PendingAdminInvite = {
  id: 'inv-1',
  adminName: 'Bogdan Manea',
  adminEmail: 'bogdan.manea@example.com',
  setupToken: 'tok-inv',
  expiresAt: Date.now() + 86400000,
  invitedAt: '2026-04-01T10:00:00Z',
  emailSentAt: null,
};

const ASOCIATII = [ASOC_TEILOR, ASOC_CRINULUI, ASOC_SUSPENDATA];
const PROVISIONS: Record<string, AdminProvisionRecord> = { 'asoc-1': PROVISION_TEILOR, 'asoc-2': PROVISION_REVOKED };
const ADDITIONAL: Record<string, AdminProvisionRecord[]> = { 'asoc-1': [EXTRA_ADMIN] };
const INVITES: PendingAdminInvite[] = [PENDING_INVITE];

function search(query: string) {
  return platformSearchResults(query, ASOCIATII, PROVISIONS, ADDITIONAL, INVITES);
}

describe('platformSearchResults', () => {
  it('returns empty array for blank query', () => {
    expect(search('')).toEqual([]);
    expect(search('   ')).toEqual([]);
  });

  it('finds asociatie by name (partial match)', () => {
    const results = search('Teilor');
    expect(results.some((r) => r.id === 'asoc:asoc-1')).toBe(true);
    expect(results.every((r) => r.kind === 'asociatie' || r.kind === 'admin')).toBe(true);
  });

  it('finds asociatie by city', () => {
    const results = search('Cluj');
    const asoc = results.find((r) => r.id === 'asoc:asoc-2');
    expect(asoc).toBeDefined();
    expect(asoc?.path).toBe('/consola/asociatii/asoc-2');
  });

  it('finds asociatie by CUI', () => {
    const results = search('12345678');
    expect(results.some((r) => r.id === 'asoc:asoc-1')).toBe(true);
  });

  it('finds admin by name', () => {
    const results = search('Popescu');
    const admin = results.find((r) => r.kind === 'admin' && r.title === 'Ion Popescu');
    expect(admin).toBeDefined();
    expect(admin?.path).toBe('/consola/asociatii/asoc-1');
  });

  it('finds admin by email', () => {
    const results = search('ion.popescu');
    expect(results.some((r) => r.subtitle === 'ion.popescu@example.com')).toBe(true);
  });

  it('excludes revoked admins from provisions', () => {
    const results = search('Maria');
    expect(results.some((r) => r.subtitle === 'maria@example.com')).toBe(false);
  });

  it('finds additional admins', () => {
    const results = search('Ana Georgescu');
    expect(results.some((r) => r.title === 'Ana Georgescu')).toBe(true);
  });

  it('finds pending invite admins', () => {
    const results = search('Bogdan');
    expect(results.some((r) => r.title === 'Bogdan Manea')).toBe(true);
  });

  it('returns asociatii before admins in results', () => {
    const results = search('Asociatia');
    const firstAdmin = results.findIndex((r) => r.kind === 'admin');
    const lastAsoc = results.map((r) => r.kind).lastIndexOf('asociatie');
    if (firstAdmin !== -1 && lastAsoc !== -1) {
      expect(lastAsoc).toBeLessThan(firstAdmin);
    }
  });

  it('is case-insensitive', () => {
    expect(search('teilor').some((r) => r.id === 'asoc:asoc-1')).toBe(true);
    expect(search('TEILOR').some((r) => r.id === 'asoc:asoc-1')).toBe(true);
  });

  it('handles diacritic normalization', () => {
    expect(search('Timisoara').some((r) => r.id === 'asoc:asoc-3')).toBe(true);
    expect(search('Timișoara').some((r) => r.id === 'asoc:asoc-3')).toBe(true);
  });

  it('caps results at 6 per kind', () => {
    const manyAsoc: PlatformAsociatieSummary[] = Array.from({ length: 10 }, (_, i) => ({
      id: `x${i}`,
      name: `Bloc ${i} Test`,
      city: 'Test',
      members: 1,
      apartments: 1,
      lastAdminSignInAt: null,
    }));
    const results = platformSearchResults('Test', manyAsoc, {}, {}, []);
    const asocResults = results.filter((r) => r.kind === 'asociatie');
    expect(asocResults.length).toBeLessThanOrEqual(6);
  });

  it('returns empty when no match', () => {
    expect(search('zzznomatch999')).toEqual([]);
  });

  it('result paths for asociatii use detail route', () => {
    const results = search('Teilor');
    const asoc = results.find((r) => r.id === 'asoc:asoc-1');
    expect(asoc?.path).toBe('/consola/asociatii/asoc-1');
  });

  it('pending invite results link to asociatii list (no asociatie yet)', () => {
    const results = search('Bogdan');
    const invite = results.find((r) => r.id === 'invite:inv-1');
    expect(invite?.path).toBe('/consola/asociatii');
  });
});
