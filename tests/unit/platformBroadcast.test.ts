import { describe, expect, it, beforeEach } from 'vitest';
import { usePlatformBroadcastStore } from '@/platform/platformBroadcastStore';
import { useBroadcastStore } from '@/shared/store/broadcastStore';
import { DEMO_PLATFORM_BROADCASTS } from '@/platform/demoPlatform';

/**
 * T253 - Unit tests for platform broadcast stores.
 * Covers: publish, expire, active/past selectors, dismissal.
 */

beforeEach(() => {
  usePlatformBroadcastStore.setState({
    broadcasts: DEMO_PLATFORM_BROADCASTS.map((b) => ({ ...b })),
    fetchError: null,
  });
  useBroadcastStore.setState({
    broadcasts: [],
    dismissed: new Set(),
    hydrated: false,
  });
});

describe('usePlatformBroadcastStore - publish', () => {
  it('prepends the new broadcast to the list', () => {
    const initial = usePlatformBroadcastStore.getState().broadcasts.length;
    usePlatformBroadcastStore.getState().publish(
      { title: 'Test', body: 'Test body', severity: 'info', target: 'all', endsAt: null },
      'op-1',
    );
    expect(usePlatformBroadcastStore.getState().broadcasts).toHaveLength(initial + 1);
    expect(usePlatformBroadcastStore.getState().broadcasts[0].title).toBe('Test');
  });

  it('sets createdBy to the provided operator id', () => {
    const bc = usePlatformBroadcastStore.getState().publish(
      { title: 'T', body: 'B', severity: 'warning', target: 'admin', endsAt: null },
      'op-42',
    );
    expect(bc.createdBy).toBe('op-42');
  });

  it('starts with expiredAt null', () => {
    const bc = usePlatformBroadcastStore.getState().publish(
      { title: 'T', body: 'B', severity: 'critical', target: 'all', endsAt: null },
      'op',
    );
    expect(bc.expiredAt).toBeNull();
  });

  it('stores the endsAt value when provided', () => {
    const ends = '2026-07-01T00:00:00Z';
    const bc = usePlatformBroadcastStore.getState().publish(
      { title: 'T', body: 'B', severity: 'info', target: 'all', endsAt: ends },
      'op',
    );
    expect(bc.endsAt).toBe(ends);
  });
});

describe('usePlatformBroadcastStore - expire', () => {
  it('sets expiredAt on the matching broadcast', () => {
    usePlatformBroadcastStore.getState().publish(
      { title: 'Live', body: 'body', severity: 'info', target: 'all', endsAt: null },
      'op',
    );
    const id = usePlatformBroadcastStore.getState().broadcasts[0].id;
    usePlatformBroadcastStore.getState().expire(id);
    const bc = usePlatformBroadcastStore.getState().broadcasts.find((b) => b.id === id);
    expect(bc?.expiredAt).toBeTruthy();
  });

  it('does not affect other broadcasts', () => {
    usePlatformBroadcastStore.getState().publish(
      { title: 'A', body: 'body', severity: 'info', target: 'all', endsAt: null },
      'op',
    );
    usePlatformBroadcastStore.getState().publish(
      { title: 'B', body: 'body', severity: 'warning', target: 'all', endsAt: null },
      'op',
    );
    const [first] = usePlatformBroadcastStore.getState().broadcasts;
    usePlatformBroadcastStore.getState().expire(first.id);
    const second = usePlatformBroadcastStore.getState().broadcasts[1];
    expect(second.expiredAt).toBeNull();
  });
});

describe('usePlatformBroadcastStore - active / past selectors', () => {
  it('active() excludes broadcasts with expiredAt set', () => {
    const bc = usePlatformBroadcastStore.getState().publish(
      { title: 'T', body: 'B', severity: 'info', target: 'all', endsAt: null },
      'op',
    );
    usePlatformBroadcastStore.getState().expire(bc.id);
    const active = usePlatformBroadcastStore.getState().active();
    expect(active.find((b) => b.id === bc.id)).toBeUndefined();
  });

  it('past() includes broadcasts with expiredAt set', () => {
    const bc = usePlatformBroadcastStore.getState().publish(
      { title: 'T', body: 'B', severity: 'info', target: 'all', endsAt: null },
      'op',
    );
    usePlatformBroadcastStore.getState().expire(bc.id);
    const past = usePlatformBroadcastStore.getState().past();
    expect(past.find((b) => b.id === bc.id)).toBeDefined();
  });
});

describe('usePlatformBroadcastStore - replace / setFetchError', () => {
  it('replace() overwrites the entire list', () => {
    usePlatformBroadcastStore.getState().replace([]);
    expect(usePlatformBroadcastStore.getState().broadcasts).toHaveLength(0);
  });

  it('setFetchError stores the error string', () => {
    usePlatformBroadcastStore.getState().setFetchError('load');
    expect(usePlatformBroadcastStore.getState().fetchError).toBe('load');
  });

  it('setFetchError(null) clears the error', () => {
    usePlatformBroadcastStore.getState().setFetchError('load');
    usePlatformBroadcastStore.getState().setFetchError(null);
    expect(usePlatformBroadcastStore.getState().fetchError).toBeNull();
  });
});

describe('useBroadcastStore - dismiss', () => {
  it('dismissed broadcasts do not appear in visible()', () => {
    useBroadcastStore.setState({
      broadcasts: [
        { id: 'b1', title: 'T1', body: 'B', severity: 'info', target: 'all', startsAt: new Date(0).toISOString(), endsAt: null },
      ],
      dismissed: new Set(),
      hydrated: true,
    });
    useBroadcastStore.getState().dismiss('b1');
    expect(useBroadcastStore.getState().visible()).toHaveLength(0);
  });

  it('visible() returns undismissed broadcasts', () => {
    useBroadcastStore.setState({
      broadcasts: [
        { id: 'b1', title: 'T1', body: 'B', severity: 'info', target: 'all', startsAt: new Date(0).toISOString(), endsAt: null },
        { id: 'b2', title: 'T2', body: 'B', severity: 'warning', target: 'all', startsAt: new Date(0).toISOString(), endsAt: null },
      ],
      dismissed: new Set(['b1']),
      hydrated: true,
    });
    const vis = useBroadcastStore.getState().visible();
    expect(vis).toHaveLength(1);
    expect(vis[0].id).toBe('b2');
  });

  it('dismiss is idempotent', () => {
    useBroadcastStore.setState({
      broadcasts: [
        { id: 'b1', title: 'T', body: 'B', severity: 'info', target: 'all', startsAt: new Date(0).toISOString(), endsAt: null },
      ],
      dismissed: new Set(),
      hydrated: true,
    });
    useBroadcastStore.getState().dismiss('b1');
    useBroadcastStore.getState().dismiss('b1');
    expect(useBroadcastStore.getState().dismissed.size).toBe(1);
  });
});
