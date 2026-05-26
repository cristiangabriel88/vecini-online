import { describe, expect, it } from 'vitest';
import type { Role } from '@/shared/types/domain';
import { isWelcomeEligibleRole, shouldShowWelcome } from '@/features/welcome/welcomeLogic';

describe('isWelcomeEligibleRole', () => {
  it('includes resident-tier roles', () => {
    const eligible: Role[] = ['proprietar', 'chirias', 'comitet', 'cenzor'];
    for (const role of eligible) expect(isWelcomeEligibleRole(role)).toBe(true);
  });

  it('excludes administering roles and superadmin', () => {
    const excluded: Role[] = ['admin', 'presedinte', 'super_admin'];
    for (const role of excluded) expect(isWelcomeEligibleRole(role)).toBe(false);
  });

  it('excludes the null (no-role) case', () => {
    expect(isWelcomeEligibleRole(null)).toBe(false);
  });
});

describe('shouldShowWelcome', () => {
  it('shows for a resident who has not seen it', () => {
    expect(
      shouldShowWelcome({ role: 'proprietar', isPlatformSuperAdmin: false, seen: false }),
    ).toBe(true);
  });

  it('hides once the resident has seen it', () => {
    expect(
      shouldShowWelcome({ role: 'proprietar', isPlatformSuperAdmin: false, seen: true }),
    ).toBe(false);
  });

  it('never shows for an admin, even when unseen', () => {
    expect(shouldShowWelcome({ role: 'admin', isPlatformSuperAdmin: false, seen: false })).toBe(
      false,
    );
  });

  it('never shows for a platform superadmin, regardless of role/seen', () => {
    expect(
      shouldShowWelcome({ role: null, isPlatformSuperAdmin: true, seen: false }),
    ).toBe(false);
    expect(
      shouldShowWelcome({ role: 'proprietar', isPlatformSuperAdmin: true, seen: false }),
    ).toBe(false);
  });

  it('hides when there is no resolved role', () => {
    expect(shouldShowWelcome({ role: null, isPlatformSuperAdmin: false, seen: false })).toBe(
      false,
    );
  });
});
