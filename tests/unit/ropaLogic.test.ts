import { describe, expect, it } from 'vitest';
import { FEATURES, FEATURE_MAP } from '@/shared/features/registry';
import {
  CATEGORY_DEFAULTS,
  PLATFORM_ACTIVITIES,
  buildRopa,
  profileFor,
  ropaToCsv,
  ropaToJson,
} from '@/features/legal/ropaLogic';

describe('ropaLogic', () => {
  it('always lists the platform activities first, regardless of enabled features', () => {
    const ropa = buildRopa([]);
    expect(ropa).toHaveLength(PLATFORM_ACTIVITIES.length);
    expect(ropa.map((a) => a.id)).toEqual(PLATFORM_ACTIVITIES.map((a) => a.id));
    expect(ropa.every((a) => a.kind === 'platform')).toBe(true);
  });

  it('adds one entry per enabled, implemented feature, in registry order', () => {
    const ropa = buildRopa(['F02', 'F01']);
    const featureEntries = ropa.filter((a) => a.kind === 'feature');
    // registry order (F01 before F02), not the input order
    expect(featureEntries.map((a) => a.featureKey)).toEqual(['F01', 'F02']);
    expect(featureEntries[0].id).toBe('F01');
  });

  it('excludes features that are not enabled', () => {
    const ropa = buildRopa(['F01']);
    const keys = ropa.filter((a) => a.kind === 'feature').map((a) => a.featureKey);
    expect(keys).toContain('F01');
    expect(keys).not.toContain('F03');
  });

  it('uses the category default for a feature with no override', () => {
    const f01 = FEATURE_MAP['F01']; // communication, no override
    expect(profileFor(f01)).toEqual(CATEGORY_DEFAULTS.communication);
  });

  it('sharpens the profile with a per-feature override (financial, legal, 10y)', () => {
    const budget = FEATURE_MAP['F12'];
    const profile = profileFor(budget);
    expect(profile.data).toContain('financial');
    expect(profile.basisKey).toBe('ropa.basis.legal');
    expect(profile.retentionKey).toBe('ropa.retain.legal10y');
  });

  it('models the anonymous channel (F05) as carrying no identity', () => {
    const profile = profileFor(FEATURE_MAP['F05']);
    expect(profile.data).not.toContain('identity');
    expect(profile.data).toEqual(['content']);
  });

  it('does not mutate the category defaults when applying an override', () => {
    const before = JSON.parse(JSON.stringify(CATEGORY_DEFAULTS.governance));
    profileFor(FEATURE_MAP['F12']); // governance + override
    expect(CATEGORY_DEFAULTS.governance).toEqual(before);
  });

  it('resolves a non-empty profile for every implemented feature (none falls outside the register)', () => {
    for (const f of FEATURES.filter((x) => x.implemented)) {
      const profile = profileFor(f);
      expect(profile.data.length).toBeGreaterThan(0);
      expect(profile.basisKey).toBeTruthy();
      expect(profile.retentionKey).toBeTruthy();
      expect(profile.recipients.length).toBeGreaterThan(0);
    }
  });

  it('serializes the register to CSV (header for rows, marker for empty)', () => {
    const csv = ropaToCsv([{ Activitate: 'Anunțuri', Temei: 'art. 6(1)(f)' }]);
    expect(csv).toContain('Activitate');
    expect(csv).toContain('Anunțuri');
    expect(ropaToCsv([])).toBe('(none)');
  });

  it('serializes the register to JSON with the art. 30 marker and metadata', () => {
    const json = ropaToJson({ asociatie: 'Bloc A1', generatedAt: '2026-05-23T00:00:00.000Z' }, [
      { Activitate: 'Cont' },
    ]);
    const parsed = JSON.parse(json);
    expect(parsed.register).toBe('art. 30 GDPR');
    expect(parsed.asociatie).toBe('Bloc A1');
    expect(parsed.activities).toHaveLength(1);
  });
});
