import { describe, expect, it } from 'vitest';
import {
  groupReports,
  usePlatformErrorStore,
  type PlatformErrorReport,
} from '../../src/platform/platformErrorStore';
import { hydrateErrorReports } from '../../src/platform/platformApi';

describe('platformErrorStore', () => {
  it('seeds demo reports on startup', () => {
    const { reports } = usePlatformErrorStore.getState();
    expect(reports.length).toBeGreaterThan(0);
  });

  it('every seeded report has required fields', () => {
    const { reports } = usePlatformErrorStore.getState();
    for (const r of reports) {
      expect(typeof r.ref).toBe('string');
      expect(r.ref.length).toBeGreaterThan(0);
      expect(typeof r.name).toBe('string');
      expect(r.name.length).toBeGreaterThan(0);
      expect(typeof r.message).toBe('string');
      expect(r.message.length).toBeGreaterThan(0);
      expect(typeof r.at).toBe('number');
      expect(r.at).toBeGreaterThan(0);
    }
  });

  it('seeded refs match the IV-XXXX-XXXX reference pattern', () => {
    const { reports } = usePlatformErrorStore.getState();
    const pattern = /^IV-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
    for (const r of reports) {
      expect(r.ref).toMatch(pattern);
    }
  });

  it('setReports replaces all reports', () => {
    const store = usePlatformErrorStore.getState();
    const fake: PlatformErrorReport[] = [
      { ref: 'IV-AAAA-BBBB', name: 'TestError', message: 'test msg', at: 1000 },
    ];
    store.setReports(fake);
    expect(usePlatformErrorStore.getState().reports).toHaveLength(1);
    expect(usePlatformErrorStore.getState().reports[0].ref).toBe('IV-AAAA-BBBB');
  });

  it('setReports clears the fetchError', () => {
    const store = usePlatformErrorStore.getState();
    store.setFetchError('load');
    store.setReports([]);
    expect(usePlatformErrorStore.getState().fetchError).toBeNull();
  });

  it('setFetchError sets the error field', () => {
    const store = usePlatformErrorStore.getState();
    store.setFetchError('load');
    expect(usePlatformErrorStore.getState().fetchError).toBe('load');
    store.setFetchError(null);
    expect(usePlatformErrorStore.getState().fetchError).toBeNull();
  });
});

describe('groupReports', () => {
  const reports: PlatformErrorReport[] = [
    { ref: 'IV-A1B2-C3D4', name: 'NetworkError', message: 'msg A', source: 'api.load', at: 1000 },
    { ref: 'IV-E5F6-G7H8', name: 'NetworkError', message: 'msg B', source: 'api.load', at: 2000 },
    { ref: 'IV-I9J0-K1L2', name: 'TypeError', message: 'msg C', source: 'logic.apply', at: 500 },
  ];

  it('groups by name+source', () => {
    const groups = groupReports(reports);
    expect(groups).toHaveLength(2);
  });

  it('counts occurrences within each group', () => {
    const groups = groupReports(reports);
    const network = groups.find((g) => g.name === 'NetworkError');
    expect(network?.count).toBe(2);
    const type = groups.find((g) => g.name === 'TypeError');
    expect(type?.count).toBe(1);
  });

  it('uses the latest occurrence message', () => {
    const groups = groupReports(reports);
    const network = groups.find((g) => g.name === 'NetworkError');
    expect(network?.message).toBe('msg B');
  });

  it('tracks firstAt and lastAt correctly', () => {
    const groups = groupReports(reports);
    const network = groups.find((g) => g.name === 'NetworkError');
    expect(network?.firstAt).toBe(1000);
    expect(network?.lastAt).toBe(2000);
  });

  it('collects all refs in the group', () => {
    const groups = groupReports(reports);
    const network = groups.find((g) => g.name === 'NetworkError');
    expect(network?.refs).toContain('IV-A1B2-C3D4');
    expect(network?.refs).toContain('IV-E5F6-G7H8');
  });

  it('sorts groups most-recent first', () => {
    const groups = groupReports(reports);
    expect(groups[0].name).toBe('NetworkError');
    expect(groups[1].name).toBe('TypeError');
  });

  it('returns empty array for empty input', () => {
    expect(groupReports([])).toHaveLength(0);
  });
});

describe('hydrateErrorReports', () => {
  it('is a function', () => {
    expect(typeof hydrateErrorReports).toBe('function');
  });

  it('is a no-op when Supabase is not configured (demo mode)', async () => {
    const before = usePlatformErrorStore.getState().reports;
    await hydrateErrorReports();
    const after = usePlatformErrorStore.getState().reports;
    expect(after).toBe(before);
  });
});
