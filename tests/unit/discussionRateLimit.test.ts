import { beforeEach, describe, expect, it } from 'vitest';
import {
  NEW_USER_HOURLY_LIMIT,
  POST_RATE_WINDOW_MS,
  canPost,
  isVettedRole,
  prunePostTimestamps,
} from '@/features/discussions/discussionLogic';
import { useDiscussionStore } from '@/features/discussions/discussionStore';

const ASOC = 'asoc-rate-test';
const USER = 'u-rate-test';

describe('isVettedRole (T66)', () => {
  it('treats admin/presedinte/comitet/cenzor/super_admin as vetted', () => {
    expect(isVettedRole('admin')).toBe(true);
    expect(isVettedRole('presedinte')).toBe(true);
    expect(isVettedRole('comitet')).toBe(true);
    expect(isVettedRole('cenzor')).toBe(true);
    expect(isVettedRole('super_admin')).toBe(true);
  });

  it('treats proprietar/locatar/null as unvetted', () => {
    expect(isVettedRole('proprietar')).toBe(false);
    expect(isVettedRole('locatar')).toBe(false);
    expect(isVettedRole(null)).toBe(false);
  });
});

describe('prunePostTimestamps (T66)', () => {
  it('keeps timestamps within the window', () => {
    const now = Date.now();
    const fresh = now - POST_RATE_WINDOW_MS + 1000;
    const old = now - POST_RATE_WINDOW_MS - 1;
    expect(prunePostTimestamps([fresh, old, now], now)).toEqual([fresh, now]);
  });

  it('returns empty for empty input', () => {
    expect(prunePostTimestamps([], Date.now())).toEqual([]);
  });
});

describe('canPost with isVettedRole integration (T66)', () => {
  it('vetted users always pass regardless of count', () => {
    expect(canPost(NEW_USER_HOURLY_LIMIT, true)).toBe(true);
    expect(canPost(NEW_USER_HOURLY_LIMIT + 100, true)).toBe(true);
  });

  it('unvetted users are blocked at the limit', () => {
    expect(canPost(NEW_USER_HOURLY_LIMIT - 1, false)).toBe(true);
    expect(canPost(NEW_USER_HOURLY_LIMIT, false)).toBe(false);
  });
});

describe('discussionStore.recordPost (T66)', () => {
  beforeEach(() => {
    useDiscussionStore.setState({ postTimestamps: {} });
  });

  it('records timestamps per author and asociație', () => {
    const now = 1_000_000;
    useDiscussionStore.getState().recordPost(ASOC, USER, now);
    useDiscussionStore.getState().recordPost(ASOC, USER, now + 1000);
    const key = `${ASOC}:${USER}`;
    expect(useDiscussionStore.getState().postTimestamps[key]).toHaveLength(2);
  });

  it('prunes old timestamps when a new post is recorded', () => {
    const old = Date.now() - POST_RATE_WINDOW_MS - 1;
    useDiscussionStore.setState({ postTimestamps: { [`${ASOC}:${USER}`]: [old] } });
    useDiscussionStore.getState().recordPost(ASOC, USER);
    const key = `${ASOC}:${USER}`;
    const stored = useDiscussionStore.getState().postTimestamps[key];
    expect(stored).toHaveLength(1);
    expect(stored[0]).not.toBe(old);
  });

  it('does not mix timestamps across different users or asociații', () => {
    const now = Date.now();
    useDiscussionStore.getState().recordPost(ASOC, USER, now);
    useDiscussionStore.getState().recordPost('asoc-other', USER, now);
    useDiscussionStore.getState().recordPost(ASOC, 'u-other', now);
    expect(useDiscussionStore.getState().postTimestamps[`${ASOC}:${USER}`]).toHaveLength(1);
    expect(useDiscussionStore.getState().postTimestamps[`asoc-other:${USER}`]).toHaveLength(1);
    expect(useDiscussionStore.getState().postTimestamps[`${ASOC}:u-other`]).toHaveLength(1);
  });
});
