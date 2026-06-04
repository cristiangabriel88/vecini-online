import { describe, expect, it } from 'vitest';
import {
  computeRollup,
  deriveHealthStatus,
  usePlatformUsageStore,
  type AssocUsageMetric,
} from '../../src/platform/platformUsageStore';
import { DEMO_PLATFORM_ASOCIATII } from '../../src/platform/demoPlatform';

// Reference epoch: 2026-06-04T00:00:00Z
const T0 = 1780531200000;
const DAY = 86400000;

function makeMetric(
  healthStatus: AssocUsageMetric['healthStatus'],
  members = 10,
  apartments = 8,
): AssocUsageMetric {
  return {
    asociatie_id: 'x',
    name: 'Test',
    city: 'City',
    members,
    apartments,
    lastAdminSignInAt: null,
    recentAnnouncements: 0,
    recentTickets: 0,
    recentVotes: 0,
    healthStatus,
  };
}

describe('deriveHealthStatus', () => {
  it('returns dormant when lastSignInAt is null', () => {
    expect(deriveHealthStatus(null, T0)).toBe('dormant');
  });

  it('returns active when sign-in is 5 days ago', () => {
    const signIn = new Date(T0 - 5 * DAY).toISOString();
    expect(deriveHealthStatus(signIn, T0)).toBe('active');
  });

  it('returns active when sign-in is 13 days ago (boundary)', () => {
    const signIn = new Date(T0 - 13 * DAY).toISOString();
    expect(deriveHealthStatus(signIn, T0)).toBe('active');
  });

  it('returns moderate when sign-in is exactly 14 days ago', () => {
    const signIn = new Date(T0 - 14 * DAY).toISOString();
    expect(deriveHealthStatus(signIn, T0)).toBe('moderate');
  });

  it('returns moderate when sign-in is 45 days ago', () => {
    const signIn = new Date(T0 - 45 * DAY).toISOString();
    expect(deriveHealthStatus(signIn, T0)).toBe('moderate');
  });

  it('returns dormant when sign-in is exactly 60 days ago', () => {
    const signIn = new Date(T0 - 60 * DAY).toISOString();
    expect(deriveHealthStatus(signIn, T0)).toBe('dormant');
  });

  it('returns dormant when sign-in is 120 days ago', () => {
    const signIn = new Date(T0 - 120 * DAY).toISOString();
    expect(deriveHealthStatus(signIn, T0)).toBe('dormant');
  });
});

describe('computeRollup', () => {
  it('returns all-zero rollup for empty array', () => {
    const r = computeRollup([]);
    expect(r).toEqual({
      total: 0, active: 0, moderate: 0, dormant: 0,
      totalMembers: 0, totalApartments: 0,
    });
  });

  it('counts total correctly', () => {
    const metrics = [
      makeMetric('active'),
      makeMetric('moderate'),
      makeMetric('dormant'),
    ];
    expect(computeRollup(metrics).total).toBe(3);
  });

  it('groups by health status correctly', () => {
    const metrics = [
      makeMetric('active'),
      makeMetric('active'),
      makeMetric('moderate'),
      makeMetric('dormant'),
    ];
    const r = computeRollup(metrics);
    expect(r.active).toBe(2);
    expect(r.moderate).toBe(1);
    expect(r.dormant).toBe(1);
  });

  it('sums members and apartments correctly', () => {
    const metrics = [
      makeMetric('active', 42, 20),
      makeMetric('moderate', 28, 24),
      makeMetric('dormant', 16, 18),
    ];
    const r = computeRollup(metrics);
    expect(r.totalMembers).toBe(86);
    expect(r.totalApartments).toBe(62);
  });
});

describe('usePlatformUsageStore', () => {
  it('seeds a metric for every demo asociatie', () => {
    const { metrics } = usePlatformUsageStore.getState();
    for (const asoc of DEMO_PLATFORM_ASOCIATII) {
      const m = metrics.find((x) => x.asociatie_id === asoc.id);
      expect(m).toBeDefined();
    }
  });

  it('demo metrics have non-negative activity counts', () => {
    const { metrics } = usePlatformUsageStore.getState();
    for (const m of metrics) {
      expect(m.recentAnnouncements).toBeGreaterThanOrEqual(0);
      expect(m.recentTickets).toBeGreaterThanOrEqual(0);
      expect(m.recentVotes).toBeGreaterThanOrEqual(0);
    }
  });

  it('demo metrics have valid health statuses', () => {
    const { metrics } = usePlatformUsageStore.getState();
    const valid = new Set(['active', 'moderate', 'dormant']);
    for (const m of metrics) {
      expect(valid.has(m.healthStatus)).toBe(true);
    }
  });

  it('first demo asociatie is active (last sign-in 11 days before T0)', () => {
    const { metrics } = usePlatformUsageStore.getState();
    const first = metrics.find((m) => m.asociatie_id === DEMO_PLATFORM_ASOCIATII[0].id);
    expect(first?.healthStatus).toBe('active');
  });

  it('third demo asociatie is moderate (last sign-in ~35 days before T0)', () => {
    const { metrics } = usePlatformUsageStore.getState();
    const third = metrics.find((m) => m.asociatie_id === DEMO_PLATFORM_ASOCIATII[2].id);
    expect(third?.healthStatus).toBe('moderate');
  });
});
