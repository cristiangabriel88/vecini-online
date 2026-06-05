import { describe, expect, it } from 'vitest';
import {
  BOARD_ROLES,
  GOVERNANCE_ROLES,
  isBoardRole,
  isGovernanceRole,
} from '@/shared/lib/roleUtils';

describe('GOVERNANCE_ROLES', () => {
  it('contains exactly admin, presedinte, comitet', () => {
    expect(GOVERNANCE_ROLES.has('admin')).toBe(true);
    expect(GOVERNANCE_ROLES.has('presedinte')).toBe(true);
    expect(GOVERNANCE_ROLES.has('comitet')).toBe(true);
    expect(GOVERNANCE_ROLES.size).toBe(3);
  });

  it('does not include cenzor, proprietar, locatar, super_admin', () => {
    expect(GOVERNANCE_ROLES.has('cenzor')).toBe(false);
    expect(GOVERNANCE_ROLES.has('proprietar')).toBe(false);
    expect(GOVERNANCE_ROLES.has('locatar')).toBe(false);
    expect(GOVERNANCE_ROLES.has('super_admin')).toBe(false);
  });
});

describe('BOARD_ROLES', () => {
  it('is a superset of GOVERNANCE_ROLES plus cenzor and super_admin', () => {
    expect(BOARD_ROLES.has('admin')).toBe(true);
    expect(BOARD_ROLES.has('presedinte')).toBe(true);
    expect(BOARD_ROLES.has('comitet')).toBe(true);
    expect(BOARD_ROLES.has('cenzor')).toBe(true);
    expect(BOARD_ROLES.has('super_admin')).toBe(true);
    expect(BOARD_ROLES.size).toBe(5);
  });

  it('does not include proprietar or locatar', () => {
    expect(BOARD_ROLES.has('proprietar')).toBe(false);
    expect(BOARD_ROLES.has('locatar')).toBe(false);
  });
});

describe('isGovernanceRole', () => {
  it('returns true for governance roles', () => {
    expect(isGovernanceRole('admin')).toBe(true);
    expect(isGovernanceRole('presedinte')).toBe(true);
    expect(isGovernanceRole('comitet')).toBe(true);
  });

  it('returns false for non-governance roles', () => {
    expect(isGovernanceRole('cenzor')).toBe(false);
    expect(isGovernanceRole('proprietar')).toBe(false);
    expect(isGovernanceRole('locatar')).toBe(false);
    expect(isGovernanceRole('super_admin')).toBe(false);
  });

  it('returns false for null', () => {
    expect(isGovernanceRole(null)).toBe(false);
  });

  it('accepts string type (for legacy string | null callers)', () => {
    expect(isGovernanceRole('admin' as string)).toBe(true);
    expect(isGovernanceRole('unknown' as string)).toBe(false);
  });
});

describe('isBoardRole', () => {
  it('returns true for board roles', () => {
    expect(isBoardRole('admin')).toBe(true);
    expect(isBoardRole('presedinte')).toBe(true);
    expect(isBoardRole('comitet')).toBe(true);
    expect(isBoardRole('cenzor')).toBe(true);
    expect(isBoardRole('super_admin')).toBe(true);
  });

  it('returns false for resident roles', () => {
    expect(isBoardRole('proprietar')).toBe(false);
    expect(isBoardRole('locatar')).toBe(false);
  });

  it('returns false for null', () => {
    expect(isBoardRole(null)).toBe(false);
  });
});
