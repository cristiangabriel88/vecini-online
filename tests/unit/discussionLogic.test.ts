import { describe, expect, it } from 'vitest';
import {
  NEW_USER_HOURLY_LIMIT,
  addMessageIn,
  addThreadIn,
  canPost,
  deleteMessageIn,
  isValidMessage,
  isValidThread,
  lastActivityAt,
  newMessage,
  newThread,
  seedThreads,
  sortThreads,
  threadsForAsociatie,
  threadsForAsociatii,
  togglePinIn,
} from '@/features/discussions/discussionLogic';
import { DEMO_ASOCIATIE, DEMO_DISCUSSIONS } from '@/shared/demo/demoData';
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

describe('per-asociație scoping (T48)', () => {
  const author = { id: 'u-1', name: 'Test User' };

  it('seeds the demo asociație with the seeded threads', () => {
    expect(seedThreads()[DEMO_ASOCIATIE.id]).toEqual(DEMO_DISCUSSIONS);
  });

  it('returns the stored threads, or an empty list for unknown/null', () => {
    const seed = seedThreads();
    expect(threadsForAsociatie(seed, DEMO_ASOCIATIE.id)).toEqual(DEMO_DISCUSSIONS);
    expect(threadsForAsociatie(seed, 'asoc-unknown')).toEqual([]);
    expect(threadsForAsociatie(seed, null)).toEqual([]);
  });

  it('returns a stable reference for the empty default (no needless re-renders)', () => {
    const seed = seedThreads();
    expect(threadsForAsociatie(seed, 'x')).toBe(threadsForAsociatie(seed, 'y'));
    expect(threadsForAsociatie(seed, null)).toBe(threadsForAsociatie({}, null));
  });

  it('newThread builds an empty thread owned by the asociație, defaulting topic', () => {
    const now = new Date('2026-05-23T10:00:00Z');
    const th = newThread({ title: 'Parcare', topic: '' }, 'asoc-b', now);
    expect(th.asociatie_id).toBe('asoc-b');
    expect(th.title).toBe('Parcare');
    expect(th.topic).toBe('#general');
    expect(th.pinned).toBe(false);
    expect(th.messages).toEqual([]);
    expect(th.created_at).toBe(now.toISOString());
  });

  it('newMessage attributes the body to its author', () => {
    const now = new Date('2026-05-23T10:00:00Z');
    const m = newMessage('dt-x', '  salut  ', author, now);
    expect(m.thread_id).toBe('dt-x');
    expect(m.author_user_id).toBe('u-1');
    expect(m.author_name).toBe('Test User');
    expect(m.body).toBe('salut');
    expect(m.created_at).toBe(now.toISOString());
  });

  it('addThreadIn prepends, is pure, and is scoped per asociație', () => {
    const before = seedThreads();
    const snapshot = JSON.parse(JSON.stringify(before));
    const th = newThread({ title: 'Nou', topic: '#parcare' }, 'asoc-b');
    const next = addThreadIn(before, 'asoc-b', th);

    expect(next).not.toBe(before);
    expect(before).toEqual(snapshot); // input untouched
    expect(threadsForAsociatie(next, 'asoc-b')[0]).toBe(th); // newest first
    expect(threadsForAsociatie(next, DEMO_ASOCIATIE.id)).toEqual(DEMO_DISCUSSIONS);
  });

  it('addMessageIn appends to the right thread without mutating', () => {
    const before = seedThreads();
    const snapshot = JSON.parse(JSON.stringify(before));
    const m = newMessage('dt-3', 'Eu vreau!', author);
    const next = addMessageIn(before, DEMO_ASOCIATIE.id, 'dt-3', m);

    expect(before).toEqual(snapshot);
    const thread = threadsForAsociatie(next, DEMO_ASOCIATIE.id).find((t) => t.id === 'dt-3');
    expect(thread?.messages.at(-1)).toBe(m);
  });

  it('togglePin and deleteMessage are pure and a no-op for an unknown asociație', () => {
    const before = seedThreads();
    const pinned = togglePinIn(before, DEMO_ASOCIATIE.id, 'dt-2');
    expect(pinned).not.toBe(before);
    expect(threadsForAsociatie(pinned, DEMO_ASOCIATIE.id).find((t) => t.id === 'dt-2')?.pinned).toBe(
      true,
    );

    const removed = deleteMessageIn(before, DEMO_ASOCIATIE.id, 'dt-1', 'dm-1');
    expect(
      threadsForAsociatie(removed, DEMO_ASOCIATIE.id)
        .find((t) => t.id === 'dt-1')
        ?.messages.some((m) => m.id === 'dm-1'),
    ).toBe(false);

    // Unknown asociație: returns the same map untouched (no phantom asociație).
    expect(togglePinIn(before, 'asoc-unknown', 'dt-1')).toBe(before);
    expect(deleteMessageIn(before, 'asoc-unknown', 'dt-1', 'dm-1')).toBe(before);
  });

  it('threadsForAsociatii unions threads across several asociații (T77), in order, deduped', () => {
    const t1 = newThread({ title: 'A', topic: '#a' }, 'a1');
    const t2 = newThread({ title: 'B', topic: '#b' }, 'a2');
    const byAsociatie = { a1: [t1], a2: [t2] };
    // Active first, dedupes a repeated id, ignores an asociație with no threads.
    expect(threadsForAsociatii(byAsociatie, ['a2', 'a1', 'a2', 'a3'])).toEqual([t2, t1]);
    expect(threadsForAsociatii(byAsociatie, [])).toEqual([]);
  });
});
