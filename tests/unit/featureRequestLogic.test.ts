import { describe, expect, it } from 'vitest';
import {
  addRequest,
  clearRequestsFor,
  hasAnyRequest,
  hasRequested,
  newFeatureRequest,
  replaceAsociatieRequests,
  summarizeRequests,
  type FeatureRequest,
} from '@/shared/features/featureRequestLogic';

// Resident feature-activation requests (T150): a resident who lands on a module
// their asociație has not enabled asks the admin to turn it on. The logic must be
// deduplicated per resident + module + asociație so a single resident cannot pile
// duplicate asks onto the admin queue (the DB unique constraint mirrors this).

const ASOC = 'asoc-1';
const FEATURE = 'F12';
const USER = 'user-1';

describe('newFeatureRequest', () => {
  it('captures the tenant, module, requester and a trimmed display name', () => {
    const r = newFeatureRequest(ASOC, FEATURE, USER, '  Ana Pop  ', 1000);
    expect(r).toMatchObject({
      asociatieId: ASOC,
      featureKey: FEATURE,
      requestedById: USER,
      requestedByName: 'Ana Pop',
      createdAt: 1000,
    });
    expect(r.id).toMatch(/^frq-/);
  });

  it('normalises a blank or missing name to null', () => {
    expect(newFeatureRequest(ASOC, FEATURE, USER, '   ').requestedByName).toBeNull();
    expect(newFeatureRequest(ASOC, FEATURE, USER, null).requestedByName).toBeNull();
  });
});

describe('hasRequested', () => {
  const existing: FeatureRequest[] = [newFeatureRequest(ASOC, FEATURE, USER, 'Ana')];

  it('is true only for the same tenant + module + resident', () => {
    expect(hasRequested(existing, ASOC, FEATURE, USER)).toBe(true);
    expect(hasRequested(existing, ASOC, FEATURE, 'user-2')).toBe(false);
    expect(hasRequested(existing, ASOC, 'F13', USER)).toBe(false);
    expect(hasRequested(existing, 'asoc-2', FEATURE, USER)).toBe(false);
  });
});

describe('hasAnyRequest', () => {
  const requests: FeatureRequest[] = [
    newFeatureRequest(ASOC, 'F12', 'u1', 'Ana', 1000),
    newFeatureRequest(ASOC, 'F12', 'u2', 'Bogdan', 2000),
    newFeatureRequest('asoc-2', 'F13', 'u3', 'Dan', 3000),
  ];

  it('is true when any resident has asked for the module in the asociație', () => {
    // Two residents asked, but presence ignores the count.
    expect(hasAnyRequest(requests, ASOC, 'F12')).toBe(true);
  });

  it('is false when the module has no demand in the asociație', () => {
    expect(hasAnyRequest(requests, ASOC, 'F13')).toBe(false);
    expect(hasAnyRequest(requests, ASOC, 'F99')).toBe(false);
    expect(hasAnyRequest([], ASOC, 'F12')).toBe(false);
  });

  it('does not leak demand across asociații', () => {
    // F13 demand belongs to asoc-2, not ASOC; F12 demand belongs to ASOC.
    expect(hasAnyRequest(requests, 'asoc-2', 'F13')).toBe(true);
    expect(hasAnyRequest(requests, 'asoc-2', 'F12')).toBe(false);
  });
});

describe('addRequest', () => {
  it('prepends a new request and reports it as added', () => {
    const { requests, added } = addRequest([], ASOC, FEATURE, USER, 'Ana');
    expect(added).not.toBeNull();
    expect(requests).toHaveLength(1);
    expect(requests[0]).toBe(added);
  });

  it('is idempotent: a duplicate ask is dropped and added is null', () => {
    const first = addRequest([], ASOC, FEATURE, USER, 'Ana');
    const second = addRequest(first.requests, ASOC, FEATURE, USER, 'Ana again');
    expect(second.added).toBeNull();
    expect(second.requests).toBe(first.requests);
    expect(second.requests).toHaveLength(1);
  });

  it('lets a different resident ask for the same module', () => {
    const first = addRequest([], ASOC, FEATURE, USER, 'Ana');
    const second = addRequest(first.requests, ASOC, FEATURE, 'user-2', 'Bogdan');
    expect(second.added).not.toBeNull();
    expect(second.requests).toHaveLength(2);
  });
});

describe('summarizeRequests', () => {
  // Two modules in ASOC, plus a row for a different asociație that must not leak.
  const requests: FeatureRequest[] = [
    newFeatureRequest(ASOC, 'F12', 'u1', 'Ana', 1000),
    newFeatureRequest(ASOC, 'F12', 'u2', 'Bogdan', 3000),
    newFeatureRequest(ASOC, 'F13', 'u3', null, 2000),
    newFeatureRequest('asoc-2', 'F12', 'u4', 'Dan', 9000),
  ];

  it('groups by module, counts requesters, and sorts newest-first', () => {
    const summary = summarizeRequests(requests, ASOC);
    expect(summary.map((s) => s.featureKey)).toEqual(['F12', 'F13']);
    expect(summary[0]).toMatchObject({ featureKey: 'F12', count: 2, latestCreatedAt: 3000 });
    expect(summary[1]).toMatchObject({ featureKey: 'F13', count: 1, latestCreatedAt: 2000 });
  });

  it('lists requester names newest-first and drops the unnamed', () => {
    const summary = summarizeRequests(requests, ASOC);
    expect(summary[0].requesterNames).toEqual(['Bogdan', 'Ana']);
    expect(summary[1].requesterNames).toEqual([]);
  });

  it('scopes to the asociație, never leaking another tenant', () => {
    expect(summarizeRequests(requests, 'asoc-2')).toHaveLength(1);
    expect(summarizeRequests(requests, 'asoc-unknown')).toEqual([]);
  });
});

describe('clearRequestsFor', () => {
  const requests: FeatureRequest[] = [
    newFeatureRequest(ASOC, 'F12', 'u1', 'Ana', 1000),
    newFeatureRequest(ASOC, 'F12', 'u2', 'Bogdan', 2000),
    newFeatureRequest(ASOC, 'F13', 'u3', 'Dan', 3000),
    newFeatureRequest('asoc-2', 'F12', 'u4', 'Ema', 4000),
  ];

  it('drops only the matching module in the matching asociație', () => {
    const next = clearRequestsFor(requests, ASOC, 'F12');
    expect(next.map((r) => r.featureKey)).toEqual(['F13', 'F12']);
    // the surviving F12 belongs to the other asociație
    expect(next.find((r) => r.featureKey === 'F12')?.asociatieId).toBe('asoc-2');
  });

  it('returns an unchanged-content list when nothing matches', () => {
    expect(clearRequestsFor(requests, ASOC, 'F99')).toHaveLength(requests.length);
  });
});

describe('replaceAsociatieRequests', () => {
  const existing: FeatureRequest[] = [
    newFeatureRequest(ASOC, 'F12', 'u1', 'Ana', 1000),
    newFeatureRequest('asoc-2', 'F12', 'u4', 'Ema', 4000),
  ];

  it('swaps the asociație slice and keeps other tenants', () => {
    const hydrated = [newFeatureRequest(ASOC, 'F13', 'u9', 'Live', 5000)];
    const next = replaceAsociatieRequests(existing, ASOC, hydrated);
    expect(next).toHaveLength(2);
    expect(next.filter((r) => r.asociatieId === ASOC).map((r) => r.featureKey)).toEqual(['F13']);
    expect(next.some((r) => r.asociatieId === 'asoc-2')).toBe(true);
  });

  it('clears the slice when hydrated is empty', () => {
    const next = replaceAsociatieRequests(existing, ASOC, []);
    expect(next.some((r) => r.asociatieId === ASOC)).toBe(false);
    expect(next).toHaveLength(1);
  });
});
