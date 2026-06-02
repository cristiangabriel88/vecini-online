import { describe, expect, it } from 'vitest';
import {
  PATH_TO_FEATURE,
  appRouteSegment,
  featureKeyForRoute,
  isFeatureRouteBlocked,
  roleMatchesAudience,
} from '@/shared/features/featureRouteLogic';
import type { FeatureFlags } from '@/shared/features/featureFlagsLogic';
import { FEATURES } from '@/shared/features/registry';

describe('featureRouteLogic', () => {
  it('maps every feature route path to its key, and only routed features', () => {
    const routed = FEATURES.filter((f) => f.path);
    expect(Object.keys(PATH_TO_FEATURE)).toHaveLength(routed.length);
    expect(PATH_TO_FEATURE['anunturi']).toBe('F01');
    expect(PATH_TO_FEATURE['aga']).toBe('F10');
    expect(PATH_TO_FEATURE['apartament-info']).toBe('F35');
  });

  it('has no two features sharing a route path (each path resolves to one key)', () => {
    const paths = FEATURES.filter((f) => f.path).map((f) => f.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('extracts the first segment under /app', () => {
    expect(appRouteSegment('/app/anunturi')).toBe('anunturi');
    expect(appRouteSegment('/app/admin/apartamente')).toBe('admin');
    expect(appRouteSegment('/app')).toBe('');
    expect(appRouteSegment('/app/')).toBe('');
    expect(appRouteSegment('/onboarding')).toBe('');
  });

  it('resolves a feature route to its key and non-feature routes to undefined', () => {
    expect(featureKeyForRoute('anunturi')).toBe('F01');
    expect(featureKeyForRoute('admin')).toBeUndefined();
    expect(featureKeyForRoute('profil')).toBeUndefined();
    expect(featureKeyForRoute('')).toBeUndefined();
  });

  it('blocks a feature route whose flag is OFF for the active asociație', () => {
    const flags: FeatureFlags = { F01: false };
    expect(isFeatureRouteBlocked(flags, '/app/anunturi')).toBe(true);
  });

  it('allows a feature route whose flag is ON', () => {
    const flags: FeatureFlags = { F01: true };
    expect(isFeatureRouteBlocked(flags, '/app/anunturi')).toBe(false);
  });

  it('treats a feature with no flag entry (brand-new asociație) as blocked', () => {
    expect(isFeatureRouteBlocked({}, '/app/aga')).toBe(true);
  });

  it('never blocks non-feature routes (home, admin, profil, unknown)', () => {
    const flags: FeatureFlags = {};
    expect(isFeatureRouteBlocked(flags, '/app')).toBe(false);
    expect(isFeatureRouteBlocked(flags, '/app/admin/apartamente')).toBe(false);
    expect(isFeatureRouteBlocked(flags, '/app/profil')).toBe(false);
    expect(isFeatureRouteBlocked(flags, '/app/actiuni')).toBe(false);
    expect(isFeatureRouteBlocked(flags, '/app/ruta-inexistenta')).toBe(false);
  });
});

describe('roleMatchesAudience', () => {
  it('allows any role when audience includes all', () => {
    expect(roleMatchesAudience(['all'], 'proprietar')).toBe(true);
    expect(roleMatchesAudience(['all'], 'locatar')).toBe(true);
    expect(roleMatchesAudience(['all'], 'comitet')).toBe(true);
    expect(roleMatchesAudience(['all'], 'admin')).toBe(true);
    expect(roleMatchesAudience(['all'], null)).toBe(true);
  });

  it('maps super_admin, admin, presedinte to the admin audience tier', () => {
    const audience = ['admin'] as const;
    expect(roleMatchesAudience([...audience], 'admin')).toBe(true);
    expect(roleMatchesAudience([...audience], 'presedinte')).toBe(true);
    expect(roleMatchesAudience([...audience], 'super_admin')).toBe(true);
    expect(roleMatchesAudience([...audience], 'comitet')).toBe(false);
    expect(roleMatchesAudience([...audience], 'proprietar')).toBe(false);
  });

  it('maps comitet and cenzor to the comitet audience tier', () => {
    const audience = ['comitet', 'admin'] as const;
    expect(roleMatchesAudience([...audience], 'comitet')).toBe(true);
    expect(roleMatchesAudience([...audience], 'cenzor')).toBe(true);
    expect(roleMatchesAudience([...audience], 'admin')).toBe(true);
    expect(roleMatchesAudience([...audience], 'proprietar')).toBe(false);
    expect(roleMatchesAudience([...audience], 'locatar')).toBe(false);
  });

  it('allows proprietar and locatar only for their own tier', () => {
    expect(roleMatchesAudience(['proprietar', 'locatar', 'admin'], 'proprietar')).toBe(true);
    expect(roleMatchesAudience(['proprietar', 'locatar', 'admin'], 'locatar')).toBe(true);
    expect(roleMatchesAudience(['proprietar', 'locatar', 'admin'], 'admin')).toBe(true);
    expect(roleMatchesAudience(['proprietar', 'locatar', 'admin'], 'comitet')).toBe(false);
  });

  it('returns false for null role when audience is not all', () => {
    expect(roleMatchesAudience(['proprietar'], null)).toBe(false);
    expect(roleMatchesAudience(['admin', 'comitet'], null)).toBe(false);
  });

  it('every registry feature with audience all allows every concrete role', () => {
    const allAudienceFeatures = FEATURES.filter((f) => f.audience.includes('all'));
    const roles = ['admin', 'presedinte', 'comitet', 'cenzor', 'proprietar', 'locatar'] as const;
    for (const f of allAudienceFeatures) {
      for (const r of roles) {
        expect(roleMatchesAudience(f.audience, r)).toBe(true);
      }
    }
  });
});
