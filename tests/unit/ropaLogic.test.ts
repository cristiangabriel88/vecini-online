import { describe, expect, it } from 'vitest';
import {
  CATEGORY_DEFAULTS,
  FEATURES,
  FEATURE_MAP,
  type RopaDataCategory,
} from '@/shared/features/registry';
import {
  PLATFORM_ACTIVITIES,
  buildRopa,
  profileFor,
  ropaToCsv,
  ropaToJson,
} from '@/features/legal/ropaLogic';

/** The data categories the registry's RopaDataCategory union declares. */
const DATA_CATEGORIES: RopaDataCategory[] = [
  'identity',
  'contact',
  'apartment',
  'content',
  'financial',
  'location',
  'optional',
  'usage',
];

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

  it('declares the per-feature override on the registry FeatureDef (single source)', () => {
    // The processing override now lives on the registry entry, not a parallel
    // map in ropaLogic, so it cannot drift from the feature definition.
    expect(FEATURE_MAP['F12'].processing?.data).toContain('financial');
    expect(FEATURE_MAP['F05'].processing?.data).toEqual(['content']);
    expect(FEATURE_MAP['F36'].processing?.basisKey).toBe('ropa.basis.consent');
    // And the resolved profile reflects exactly what the registry declares.
    expect(profileFor(FEATURE_MAP['F12'])).toMatchObject({
      ...CATEGORY_DEFAULTS.governance,
      ...FEATURE_MAP['F12'].processing,
    });
  });

  it('inherits the category default verbatim for every feature with no override', () => {
    for (const f of FEATURES.filter((x) => x.implemented && !x.processing)) {
      expect(profileFor(f)).toEqual(CATEGORY_DEFAULTS[f.category]);
    }
  });

  it('keeps every declared processing override well-formed (non-empty, valid keys)', () => {
    for (const f of FEATURES.filter((x) => x.processing)) {
      const o = f.processing!;
      // A declared override must actually set at least one field.
      expect(Object.keys(o).length).toBeGreaterThan(0);
      o.data?.forEach((d) => expect(DATA_CATEGORIES).toContain(d));
      if (o.data) expect(o.data.length).toBeGreaterThan(0);
      if (o.basisKey) expect(o.basisKey.startsWith('ropa.basis.')).toBe(true);
      if (o.retentionKey) expect(o.retentionKey.startsWith('ropa.retain.')).toBe(true);
      o.recipients?.forEach((r) => expect(r.startsWith('ropa.recip.')).toBe(true));
      if (o.recipients) expect(o.recipients.length).toBeGreaterThan(0);
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
