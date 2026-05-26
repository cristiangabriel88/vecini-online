import { describe, expect, it } from 'vitest';
import {
  addRequest,
  hasRequested,
  newFeatureRequest,
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
