import { describe, expect, it } from 'vitest';
import {
  NEW_USER_HOURLY_LIMIT,
  canPost,
  isValidMessage,
  isValidThread,
  lastActivityAt,
  sortThreads,
} from '@/features/discussions/discussionLogic';
import type { DiscussionThread } from '@/shared/types/domain';

const mk = (
  id: string,
  pinned: boolean,
  created: string,
  msgTimes: string[],
): DiscussionThread => ({
  id,
  asociatie_id: 'a',
  topic: '#general',
  title: id,
  pinned,
  created_at: created,
  messages: msgTimes.map((tts, i) => ({
    id: `${id}-${i}`,
    thread_id: id,
    author_user_id: 'u',
    author_name: 'U',
    body: 'hi',
    created_at: tts,
  })),
});

describe('isValidMessage', () => {
  it('requires non-blank text within length', () => {
    expect(isValidMessage('salut')).toBe(true);
    expect(isValidMessage('   ')).toBe(false);
    expect(isValidMessage('x'.repeat(2001))).toBe(false);
  });
});

describe('isValidThread', () => {
  it('requires a title', () => {
    expect(isValidThread('Parcare')).toBe(true);
    expect(isValidThread('  ')).toBe(false);
  });
});

describe('lastActivityAt', () => {
  it('uses the newest message, falling back to creation', () => {
    const t = mk('t1', false, '2026-01-01T00:00:00Z', [
      '2026-01-02T00:00:00Z',
      '2026-01-05T00:00:00Z',
      '2026-01-03T00:00:00Z',
    ]);
    expect(lastActivityAt(t)).toBe('2026-01-05T00:00:00Z');
    expect(lastActivityAt(mk('t2', false, '2026-01-01T00:00:00Z', []))).toBe('2026-01-01T00:00:00Z');
  });
});

describe('sortThreads', () => {
  it('floats pinned threads, then orders by latest activity', () => {
    const a = mk('a', false, '2026-01-01T00:00:00Z', ['2026-01-10T00:00:00Z']);
    const b = mk('b', true, '2026-01-01T00:00:00Z', ['2026-01-02T00:00:00Z']);
    const c = mk('c', false, '2026-01-01T00:00:00Z', ['2026-01-05T00:00:00Z']);
    expect(sortThreads([a, b, c]).map((t) => t.id)).toEqual(['b', 'a', 'c']);
  });
});

describe('canPost', () => {
  it('rate-limits unvetted users only', () => {
    expect(canPost(NEW_USER_HOURLY_LIMIT, true)).toBe(true);
    expect(canPost(NEW_USER_HOURLY_LIMIT - 1, false)).toBe(true);
    expect(canPost(NEW_USER_HOURLY_LIMIT, false)).toBe(false);
  });
});
