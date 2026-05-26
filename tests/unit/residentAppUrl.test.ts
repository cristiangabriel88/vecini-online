import { describe, expect, it } from 'vitest';
import { resolveResidentAppUrl } from '@/shared/lib/env';

/**
 * T133: onboarding/setup links minted in the superadmin console (its own
 * subdomain) must target the resident/admin origin, not the platform origin
 * that `appUrl` resolves to there. `resolveResidentAppUrl` defines the fallback
 * chain VITE_RESIDENT_APP_URL -> VITE_APP_URL (passed in as `appUrl`).
 */
describe('resolveResidentAppUrl', () => {
  const appUrl = 'https://admin.vecini.online';
  const resident = 'https://vecini.online';

  it('prefers an explicit resident URL over the app URL', () => {
    expect(resolveResidentAppUrl(resident, appUrl)).toBe(resident);
  });

  it('falls back to the app URL when the resident URL is unset', () => {
    expect(resolveResidentAppUrl(undefined, appUrl)).toBe(appUrl);
  });

  it('falls back to the app URL when the resident URL is blank or whitespace', () => {
    expect(resolveResidentAppUrl('', appUrl)).toBe(appUrl);
    expect(resolveResidentAppUrl('   ', appUrl)).toBe(appUrl);
  });

  it('trims surrounding whitespace from an explicit resident URL', () => {
    expect(resolveResidentAppUrl('  https://vecini.online  ', appUrl)).toBe(resident);
  });
});
