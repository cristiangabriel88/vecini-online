import { describe, expect, it } from 'vitest';
import {
  PATH_TO_FEATURE,
  appRouteSegment,
  featureKeyForRoute,
  isFeatureRouteBlocked,
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
