import { describe, expect, it } from 'vitest';
import {
  resolvePlatformAccess,
  type PlatformAccessInput,
} from '@/platform/platformAuthLogic';
import {
  DEMO_PLATFORM_ASOCIATII,
  platformTotals,
} from '@/platform/demoPlatform';

// T93/T100 — the platform (superadmin) app shell. The gate's behaviour is driven
// by a single pure decision (resolvePlatformAccess) so it can be exhaustively
// checked offline, and the demo overview totals are derived purely.

const base: PlatformAccessInput = {
  loading: false,
  demo: false,
  hasSession: false,
  verifying: false,
  isSuperAdmin: null,
};

const liveGranted: PlatformAccessInput = {
  ...base,
  hasSession: true,
  isSuperAdmin: true,
  supabaseConfigured: true,
  mfaLoaded: true,
  mfaEnrolled: true,
};

describe('resolvePlatformAccess (T93)', () => {
  it('grants the offline demo session unconditionally (short-circuits live signals)', () => {
    // Even mid-load or with a denied live check, demo always grants the console.
    expect(resolvePlatformAccess({ ...base, demo: true })).toBe('granted');
    expect(
      resolvePlatformAccess({ ...base, demo: true, loading: true, isSuperAdmin: false }),
    ).toBe('granted');
  });

  it('holds on loading while the shared session is being restored', () => {
    expect(resolvePlatformAccess({ ...base, loading: true })).toBe('loading');
  });

  it('routes to login when there is neither a session nor demo', () => {
    expect(resolvePlatformAccess({ ...base })).toBe('unauthenticated');
  });

  it('verifies while a live session exists but the check has not resolved', () => {
    // isSuperAdmin still null => verifying (never flash console or denial).
    expect(resolvePlatformAccess({ ...base, hasSession: true })).toBe('verifying');
    // the rpc is in flight
    expect(
      resolvePlatformAccess({ ...base, hasSession: true, verifying: true }),
    ).toBe('verifying');
  });

  it('grants a verified platform superadmin with 2FA enrolled', () => {
    expect(resolvePlatformAccess(liveGranted)).toBe('granted');
  });

  it('denies a live session whose super_admin check returned false', () => {
    expect(
      resolvePlatformAccess({ ...base, hasSession: true, isSuperAdmin: false }),
    ).toBe('denied');
  });

  it('never denies before the check resolves (unknown result is verifying, not denied)', () => {
    const access = resolvePlatformAccess({ ...base, hasSession: true, isSuperAdmin: null });
    expect(access).not.toBe('denied');
    expect(access).toBe('verifying');
  });
});

describe('resolvePlatformAccess — mandatory MFA enrollment (T100)', () => {
  it('requires enrollment when superadmin is live and 2FA is not enrolled', () => {
    expect(
      resolvePlatformAccess({
        ...liveGranted,
        mfaEnrolled: false,
      }),
    ).toBe('mfa-enrollment-required');
  });

  it('grants the console once 2FA is enrolled', () => {
    expect(resolvePlatformAccess(liveGranted)).toBe('granted');
  });

  it('does not require enrollment when MFA status is not yet loaded (avoids flash)', () => {
    // mfaLoaded: false => the gate should not block while the status resolves
    expect(
      resolvePlatformAccess({
        ...liveGranted,
        mfaLoaded: false,
        mfaEnrolled: false,
      }),
    ).toBe('granted');
  });

  it('does not require enrollment in demo mode regardless of enrollment status', () => {
    // Demo always short-circuits to granted.
    expect(
      resolvePlatformAccess({
        ...liveGranted,
        demo: true,
        mfaEnrolled: false,
      }),
    ).toBe('granted');
  });

  it('does not require enrollment when Supabase is not configured (offline)', () => {
    expect(
      resolvePlatformAccess({
        ...liveGranted,
        supabaseConfigured: false,
        mfaEnrolled: false,
      }),
    ).toBe('granted');
  });

  it('does not require enrollment when supabaseConfigured is absent (legacy callers)', () => {
    const { supabaseConfigured: _sc, mfaLoaded: _ml, mfaEnrolled: _me, ...legacy } = liveGranted;
    expect(resolvePlatformAccess(legacy)).toBe('granted');
  });
});

describe('demo platform totals (T93)', () => {
  it('sums the headline totals across the seeded asociație summaries', () => {
    const totals = platformTotals(DEMO_PLATFORM_ASOCIATII);
    expect(totals.asociatii).toBe(DEMO_PLATFORM_ASOCIATII.length);
    expect(totals.members).toBe(
      DEMO_PLATFORM_ASOCIATII.reduce((n, r) => n + r.members, 0),
    );
    expect(totals.apartments).toBe(
      DEMO_PLATFORM_ASOCIATII.reduce((n, r) => n + r.apartments, 0),
    );
  });

  it('returns zeroes for an empty platform', () => {
    expect(platformTotals([])).toEqual({ asociatii: 0, members: 0, apartments: 0 });
  });

  it('seeds a representative multi-asociație platform so the demo console is not empty', () => {
    expect(DEMO_PLATFORM_ASOCIATII.length).toBeGreaterThanOrEqual(2);
    for (const row of DEMO_PLATFORM_ASOCIATII) {
      expect(row.members).toBeGreaterThan(0);
      expect(row.apartments).toBeGreaterThan(0);
    }
  });
});
