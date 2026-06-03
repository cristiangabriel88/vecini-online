import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  PRIVILEGED_SESSION_MAX_MS,
  clearPrivilegedSigninStamp,
  consumeForcedSignoutReason,
  getPrivilegedSigninAgeMs,
  isPrivilegedRole,
  isPrivilegedSessionExpired,
  markForcedSignout,
  stampPrivilegedSignin,
} from '@/features/auth/sessionExpiry';

const NOW = 1_000_000_000;
const EIGHT_HOURS = 8 * 60 * 60 * 1000;

beforeEach(() => {
  clearPrivilegedSigninStamp();
  // clear forced-signout flag
  try { sessionStorage.removeItem('vecini.auth.forcedSignout'); } catch { /* ignore */ }
});

afterEach(() => {
  clearPrivilegedSigninStamp();
  try { sessionStorage.removeItem('vecini.auth.forcedSignout'); } catch { /* ignore */ }
});

describe('isPrivilegedRole', () => {
  it('returns true for admin, presedinte, comitet, cenzor', () => {
    expect(isPrivilegedRole('admin')).toBe(true);
    expect(isPrivilegedRole('presedinte')).toBe(true);
    expect(isPrivilegedRole('comitet')).toBe(true);
    expect(isPrivilegedRole('cenzor')).toBe(true);
  });

  it('returns false for non-privileged roles', () => {
    expect(isPrivilegedRole('proprietar')).toBe(false);
    expect(isPrivilegedRole('locatar')).toBe(false);
    expect(isPrivilegedRole('super_admin')).toBe(false);
  });

  it('returns false for null and undefined', () => {
    expect(isPrivilegedRole(null)).toBe(false);
    expect(isPrivilegedRole(undefined)).toBe(false);
  });
});

describe('stampPrivilegedSignin / getPrivilegedSigninAgeMs', () => {
  it('returns null when no stamp exists', () => {
    expect(getPrivilegedSigninAgeMs(NOW)).toBeNull();
  });

  it('returns 0 immediately after stamping', () => {
    stampPrivilegedSignin(NOW);
    expect(getPrivilegedSigninAgeMs(NOW)).toBe(0);
  });

  it('reflects elapsed time', () => {
    stampPrivilegedSignin(NOW);
    expect(getPrivilegedSigninAgeMs(NOW + 5000)).toBe(5000);
  });

  it('clearPrivilegedSigninStamp removes the stamp', () => {
    stampPrivilegedSignin(NOW);
    clearPrivilegedSigninStamp();
    expect(getPrivilegedSigninAgeMs(NOW)).toBeNull();
  });
});

describe('isPrivilegedSessionExpired', () => {
  it('returns false when no stamp exists for a privileged role', () => {
    expect(isPrivilegedSessionExpired('admin', NOW)).toBe(false);
  });

  it('returns false for a fresh privileged session', () => {
    stampPrivilegedSignin(NOW);
    expect(isPrivilegedSessionExpired('admin', NOW + 1000)).toBe(false);
  });

  it('returns false just before the 8-hour threshold', () => {
    stampPrivilegedSignin(NOW);
    expect(isPrivilegedSessionExpired('admin', NOW + EIGHT_HOURS - 1)).toBe(false);
  });

  it('returns true just after the 8-hour threshold for a privileged role', () => {
    stampPrivilegedSignin(NOW);
    expect(isPrivilegedSessionExpired('admin', NOW + EIGHT_HOURS + 1)).toBe(true);
  });

  it('returns false for a non-privileged role even after 8 hours', () => {
    stampPrivilegedSignin(NOW);
    expect(isPrivilegedSessionExpired('proprietar', NOW + EIGHT_HOURS + 1)).toBe(false);
  });

  it('returns false for null role after 8 hours (demo-like)', () => {
    stampPrivilegedSignin(NOW);
    expect(isPrivilegedSessionExpired(null, NOW + EIGHT_HOURS + 1)).toBe(false);
  });

  it('PRIVILEGED_SESSION_MAX_MS equals 8 hours exactly', () => {
    expect(PRIVILEGED_SESSION_MAX_MS).toBe(EIGHT_HOURS);
  });
});

describe('markForcedSignout / consumeForcedSignoutReason', () => {
  it('returns null when no forced sign-out was marked', () => {
    expect(consumeForcedSignoutReason()).toBeNull();
  });

  it('returns the reason after marking', () => {
    markForcedSignout();
    expect(consumeForcedSignoutReason()).toBe('privileged-expiry');
  });

  it('consuming clears the flag (idempotent)', () => {
    markForcedSignout();
    consumeForcedSignoutReason();
    expect(consumeForcedSignoutReason()).toBeNull();
  });
});
