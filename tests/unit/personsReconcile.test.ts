/**
 * T117: Reconcile embedded persons with account-linked apartment_residents.
 *
 * Verifies the static contracts:
 * - isPersonClaimed correctly identifies claimed vs. unclaimed entries
 * - claimPersonInList matches by name (case-insensitive) first
 * - claimPersonInList falls back to role when name does not match
 * - Already-claimed entries are not re-claimed
 * - No match returns the list unchanged
 * - Migration + domain type source contracts
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { isPersonClaimed, claimPersonInList } from '@/features/admin/apartmentsLogic';
import type { ApartmentPerson } from '@/shared/types/domain';

function makePerson(overrides: Partial<ApartmentPerson> = {}): ApartmentPerson {
  return {
    id: `pe-${Math.random().toString(36).slice(2)}`,
    name: 'Popescu Ion',
    role: 'proprietar',
    is_primary: true,
    email: null,
    ...overrides,
  };
}

// ── isPersonClaimed ────────────────────────────────────────────────────────

describe('isPersonClaimed', () => {
  it('returns false when claimed_user_id is absent', () => {
    expect(isPersonClaimed(makePerson())).toBe(false);
  });

  it('returns false when claimed_user_id is null', () => {
    expect(isPersonClaimed(makePerson({ claimed_user_id: null }))).toBe(false);
  });

  it('returns true when claimed_user_id is a non-empty string', () => {
    expect(isPersonClaimed(makePerson({ claimed_user_id: 'user-uuid-abc' }))).toBe(true);
  });
});

// ── claimPersonInList ──────────────────────────────────────────────────────

describe('claimPersonInList — name match', () => {
  it('claims the entry whose name matches inviteeName (case-insensitive)', () => {
    const persons = [
      makePerson({ name: 'Popescu Ion', role: 'proprietar' }),
      makePerson({ name: 'Ionescu Maria', role: 'chirias' }),
    ];
    const result = claimPersonInList(persons, 'user-1', 'popescu ION', 'proprietar');
    expect(result[0].claimed_user_id).toBe('user-1');
    expect(result[1].claimed_user_id).toBeUndefined();
  });

  it('trims whitespace in both name and inviteeName before comparing', () => {
    const persons = [makePerson({ name: '  Popescu Ion  ', role: 'proprietar' })];
    const result = claimPersonInList(persons, 'user-2', ' Popescu Ion ', 'proprietar');
    expect(result[0].claimed_user_id).toBe('user-2');
  });

  it('prefers name match over role fallback when both exist', () => {
    const persons = [
      makePerson({ name: 'Ionescu Radu', role: 'proprietar' }),
      makePerson({ name: 'Popescu Ion', role: 'proprietar' }),
    ];
    const result = claimPersonInList(persons, 'user-3', 'Popescu Ion', 'proprietar');
    expect(result[0].claimed_user_id).toBeUndefined();
    expect(result[1].claimed_user_id).toBe('user-3');
  });
});

describe('claimPersonInList — role fallback', () => {
  it('claims the first unclaimed entry with the matching role when name does not match', () => {
    const persons = [
      makePerson({ name: 'Somebody Else', role: 'chirias' }),
      makePerson({ name: 'Ionescu Maria', role: 'proprietar' }),
    ];
    const result = claimPersonInList(persons, 'user-4', 'No Match', 'proprietar');
    expect(result[0].claimed_user_id).toBeUndefined();
    expect(result[1].claimed_user_id).toBe('user-4');
  });

  it('uses role fallback when inviteeName is null', () => {
    const persons = [makePerson({ name: 'Popescu Ion', role: 'chirias' })];
    const result = claimPersonInList(persons, 'user-5', null, 'chirias');
    expect(result[0].claimed_user_id).toBe('user-5');
  });

  it('uses role fallback when inviteeName is empty string', () => {
    const persons = [makePerson({ name: 'Popescu Ion', role: 'proprietar' })];
    const result = claimPersonInList(persons, 'user-6', '   ', 'proprietar');
    expect(result[0].claimed_user_id).toBe('user-6');
  });
});

describe('claimPersonInList — no-match cases', () => {
  it('returns the list unchanged when no name match and no role match', () => {
    const persons = [makePerson({ name: 'Popescu Ion', role: 'chirias' })];
    const result = claimPersonInList(persons, 'user-7', 'No Match', 'proprietar');
    expect(result).toEqual(persons);
    expect(result[0].claimed_user_id).toBeUndefined();
  });

  it('returns the list unchanged when the list is empty', () => {
    const result = claimPersonInList([], 'user-8', 'Popescu Ion', 'proprietar');
    expect(result).toEqual([]);
  });

  it('does not claim an already-claimed entry by name', () => {
    const persons = [
      makePerson({ name: 'Popescu Ion', role: 'proprietar', claimed_user_id: 'existing-user' }),
    ];
    const result = claimPersonInList(persons, 'new-user', 'Popescu Ion', 'proprietar');
    // No unclaimed entry found -- list unchanged.
    expect(result[0].claimed_user_id).toBe('existing-user');
  });

  it('does not claim an already-claimed entry by role fallback', () => {
    const persons = [
      makePerson({ role: 'proprietar', claimed_user_id: 'existing-user' }),
    ];
    const result = claimPersonInList(persons, 'new-user', null, 'proprietar');
    expect(result[0].claimed_user_id).toBe('existing-user');
  });
});

describe('claimPersonInList — immutability', () => {
  it('does not mutate the original array or person object', () => {
    const p = makePerson({ name: 'Popescu Ion', role: 'proprietar' });
    const persons = [p];
    claimPersonInList(persons, 'user-9', 'Popescu Ion', 'proprietar');
    expect(p.claimed_user_id).toBeUndefined();
    expect(persons[0]).toBe(p);
  });
});

// ── Domain type contract ───────────────────────────────────────────────────

describe('ApartmentPerson domain type — claimed_user_id field', () => {
  it('claimed_user_id is present in the type declaration', () => {
    const src = readFileSync(
      resolve(process.cwd(), 'src/shared/types/domain.ts'),
      'utf8',
    );
    expect(src).toMatch(/claimed_user_id\?\s*:\s*string\s*\|\s*null/);
  });
});

// ── Migration source contracts ─────────────────────────────────────────────

describe('migration 20260527000006 — persons claim in redeem_onboarding_token', () => {
  const src = readFileSync(
    resolve(process.cwd(), 'supabase/migrations/20260527000006_reconcile_persons_claim.sql'),
    'utf8',
  );

  it('replaces redeem_onboarding_token (idempotent)', () => {
    expect(src).toMatch(/CREATE OR REPLACE FUNCTION public\.redeem_onboarding_token/);
  });

  it('sets claimed_user_id in the persons jsonb', () => {
    expect(src).toMatch(/claimed_user_id/);
    expect(src).toMatch(/jsonb_set/);
  });

  it('performs name match (case-insensitive lower/trim)', () => {
    expect(src).toMatch(/lower.*trim.*invitee_name/s);
  });

  it('has a role fallback pass', () => {
    expect(src).toMatch(/->> 'role'.*=.*v_role/);
  });

  it('skips already-claimed entries in both passes', () => {
    const claimedGuard = src.match(/claimed_user_id.*IS NULL/g);
    expect(claimedGuard).not.toBeNull();
    expect(claimedGuard!.length).toBeGreaterThanOrEqual(2);
  });

  it('revokes PUBLIC execute (security definer)', () => {
    expect(src).toMatch(/REVOKE ALL ON FUNCTION.*redeem_onboarding_token/);
    expect(src).toMatch(/GRANT EXECUTE.*TO authenticated/);
  });
});
