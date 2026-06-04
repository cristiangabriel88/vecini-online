import { describe, expect, it } from 'vitest';
import { verifyChain } from '../../src/features/audit/auditLogic';
import { DEMO_PLATFORM_ASOCIATII } from '../../src/platform/demoPlatform';
import { usePlatformAuditStore } from '../../src/platform/platformAuditStore';
import { hydrateAllAuditLogs } from '../../src/platform/platformApi';

describe('platformAuditStore', () => {
  it('seeds a chain for every demo asociatie', () => {
    const { chains } = usePlatformAuditStore.getState();
    for (const asoc of DEMO_PLATFORM_ASOCIATII) {
      expect(chains[asoc.id]).toBeDefined();
      expect(chains[asoc.id].length).toBeGreaterThan(0);
    }
  });

  it('seeds distinct chains (not all the same reference)', () => {
    const { chains } = usePlatformAuditStore.getState();
    const ids = DEMO_PLATFORM_ASOCIATII.map((a) => a.id);
    expect(ids.length).toBeGreaterThanOrEqual(2);
    expect(chains[ids[0]]).not.toBe(chains[ids[1]]);
  });

  it('every seeded chain passes verifyChain', () => {
    const { chains } = usePlatformAuditStore.getState();
    for (const asoc of DEMO_PLATFORM_ASOCIATII) {
      const result = verifyChain(chains[asoc.id] ?? []);
      expect(result.ok).toBe(true);
      expect(result.brokenAt).toBeNull();
    }
  });

  it('seeded chains are scoped to their own asociatie_id', () => {
    const { chains } = usePlatformAuditStore.getState();
    for (const asoc of DEMO_PLATFORM_ASOCIATII) {
      for (const entry of chains[asoc.id] ?? []) {
        expect(entry.asociatie_id).toBe(asoc.id);
      }
    }
  });

  it('setChains replaces all chains', () => {
    const store = usePlatformAuditStore.getState();
    store.setChains({ 'x-123': [] });
    const { chains } = usePlatformAuditStore.getState();
    expect(chains['x-123']).toBeDefined();
    expect(chains[DEMO_PLATFORM_ASOCIATII[0].id]).toBeUndefined();
    // restore for other tests
    store.setChains(
      Object.fromEntries(
        DEMO_PLATFORM_ASOCIATII.map((a) => [
          a.id,
          usePlatformAuditStore.getState().chains[a.id] ?? [],
        ]),
      ),
    );
  });

  it('setFetchError sets the error field', () => {
    const store = usePlatformAuditStore.getState();
    store.setFetchError('load');
    expect(usePlatformAuditStore.getState().fetchError).toBe('load');
    store.setFetchError(null);
    expect(usePlatformAuditStore.getState().fetchError).toBeNull();
  });

  it('setChains clears the fetchError', () => {
    const store = usePlatformAuditStore.getState();
    store.setFetchError('load');
    store.setChains({});
    expect(usePlatformAuditStore.getState().fetchError).toBeNull();
  });
});

describe('hydrateAllAuditLogs', () => {
  it('is a function', () => {
    expect(typeof hydrateAllAuditLogs).toBe('function');
  });

  it('is a no-op when Supabase is not configured (demo mode)', async () => {
    const before = usePlatformAuditStore.getState().chains;
    await hydrateAllAuditLogs();
    const after = usePlatformAuditStore.getState().chains;
    expect(after).toBe(before);
  });
});
