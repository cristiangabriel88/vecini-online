/**
 * T135: Cross-origin redirect for platform superadmins.
 *
 * Verifies the pure routing decision and source contracts:
 * - resolveAsociatieRoute returns 'platform-redirect' when platformUrl is set + superadmin
 * - resolveAsociatieRoute returns 'superadmin' (in-app) when platformUrl is absent
 * - Existing behaviour is unchanged (onboarding, app, never-to-onboarding invariant)
 * - env.ts reads VITE_PLATFORM_URL; RequireAsociatie + AppHome handle the new variant
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { resolveAsociatieRoute } from '@/features/auth/hydrationLogic';

const PLATFORM_URL = 'https://admin.vecini.online';

// ── resolveAsociatieRoute with platformUrl ────────────────────────────────

describe('resolveAsociatieRoute — platform-redirect variant (T135)', () => {
  it('returns platform-redirect when superadmin + platformUrl is set', () => {
    expect(
      resolveAsociatieRoute({
        isPlatformSuperAdmin: true,
        hasActiveMembership: false,
        platformUrl: PLATFORM_URL,
      }),
    ).toBe('platform-redirect');
  });

  it('still returns platform-redirect even when the superadmin also holds a membership', () => {
    expect(
      resolveAsociatieRoute({
        isPlatformSuperAdmin: true,
        hasActiveMembership: true,
        platformUrl: PLATFORM_URL,
      }),
    ).toBe('platform-redirect');
  });

  it('returns superadmin (in-app preview) when platformUrl is null', () => {
    expect(
      resolveAsociatieRoute({
        isPlatformSuperAdmin: true,
        hasActiveMembership: false,
        platformUrl: null,
      }),
    ).toBe('superadmin');
  });

  it('returns superadmin when platformUrl is undefined (backwards-compat)', () => {
    expect(
      resolveAsociatieRoute({ isPlatformSuperAdmin: true, hasActiveMembership: false }),
    ).toBe('superadmin');
  });

  it('returns superadmin when platformUrl is an empty string (trimmed falsy)', () => {
    expect(
      resolveAsociatieRoute({
        isPlatformSuperAdmin: true,
        hasActiveMembership: false,
        platformUrl: '',
      }),
    ).toBe('superadmin');
  });

  it('never returns platform-redirect for a non-superadmin, regardless of platformUrl', () => {
    for (const hasActiveMembership of [true, false]) {
      const route = resolveAsociatieRoute({
        isPlatformSuperAdmin: false,
        hasActiveMembership,
        platformUrl: PLATFORM_URL,
      });
      expect(route).not.toBe('platform-redirect');
    }
  });
});

// ── existing behaviour preserved ──────────────────────────────────────────

describe('resolveAsociatieRoute — existing behaviour unchanged', () => {
  it('superadmin without platformUrl still gets the in-app console (no regressions)', () => {
    expect(
      resolveAsociatieRoute({ isPlatformSuperAdmin: true, hasActiveMembership: false }),
    ).toBe('superadmin');
  });

  it('non-member non-superadmin goes to onboarding', () => {
    expect(
      resolveAsociatieRoute({ isPlatformSuperAdmin: false, hasActiveMembership: false }),
    ).toBe('onboarding');
  });

  it('association member reaches the app', () => {
    expect(
      resolveAsociatieRoute({ isPlatformSuperAdmin: false, hasActiveMembership: true }),
    ).toBe('app');
  });

  it('superadmin is never routed to onboarding (invariant)', () => {
    for (const hasActiveMembership of [true, false]) {
      for (const platformUrl of [PLATFORM_URL, null, undefined]) {
        expect(
          resolveAsociatieRoute({ isPlatformSuperAdmin: true, hasActiveMembership, platformUrl }),
        ).not.toBe('onboarding');
      }
    }
  });
});

// ── source contracts ───────────────────────────────────────────────────────

describe('env.ts — platformUrl field', () => {
  it('declares platformUrl in ClientEnv', () => {
    const src = readFileSync(resolve(process.cwd(), 'src/shared/lib/env.ts'), 'utf8');
    expect(src).toMatch(/platformUrl\s*:\s*string\s*\|\s*null/);
  });

  it('reads VITE_PLATFORM_URL', () => {
    const src = readFileSync(resolve(process.cwd(), 'src/shared/lib/env.ts'), 'utf8');
    expect(src).toMatch(/VITE_PLATFORM_URL/);
  });

  it('defaults to null when VITE_PLATFORM_URL is unset', () => {
    const src = readFileSync(resolve(process.cwd(), 'src/shared/lib/env.ts'), 'utf8');
    expect(src).toMatch(/\|\|\s*null/);
  });
});

describe('RequireAsociatie — handles platform-redirect', () => {
  const src = readFileSync(
    resolve(process.cwd(), 'src/app/RequireAsociatie.tsx'),
    'utf8',
  );

  it('passes platformUrl to resolveAsociatieRoute', () => {
    expect(src).toMatch(/platformUrl/);
    expect(src).toMatch(/env\.platformUrl/);
  });

  it('returns null for platform-redirect (no resident content shown)', () => {
    expect(src).toMatch(/platform-redirect.*null|null.*platform-redirect/s);
  });

  it('uses useEffect for the window.location.href redirect', () => {
    expect(src).toMatch(/useEffect/);
    expect(src).toMatch(/window\.location\.href/);
  });
});

describe('AppHome — handles platform-redirect', () => {
  const src = readFileSync(resolve(process.cwd(), 'src/app/AppHome.tsx'), 'utf8');

  it('imports env and uses platformUrl', () => {
    expect(src).toMatch(/env\.platformUrl/);
  });

  it('performs a window.location.href redirect when platformUrl is set', () => {
    expect(src).toMatch(/window\.location\.href/);
  });

  it('falls back to SUPERADMIN_HOME_PATH navigate when platformUrl is null', () => {
    expect(src).toMatch(/SUPERADMIN_HOME_PATH/);
    expect(src).toMatch(/Navigate/);
  });
});
