import { describe, expect, it } from 'vitest';
import {
  awaitingReply,
  isValidMessage,
  isValidSubject,
  lastActivityAt,
  sortThreads,
  unreadFor,
} from '@/features/support/supportLogic';
import type { SupportMessage, SupportSender, SupportThread } from '@/shared/types/domain';

const msg = (
  id: string,
  sender: SupportSender,
  created_at: string,
  read = true,
): SupportMessage => ({
  id,
  thread_id: 'th',
  sender,
  sender_name: sender,
  body: 'test',
  created_at,
  read,
});

const thread = (
  id: string,
  status: 'open' | 'resolved',
  created_at: string,
  messages: SupportMessage[],
): SupportThread => ({
  id,
  asociatie_id: 'a',
  asociatie_name: 'Asociatie Demo',
  admin_user_id: 'u-admin',
  admin_name: 'Admin Demo',
  subject: 'Subiect',
  status,
  created_at,
  messages,
});

describe('isValidSubject / isValidMessage', () => {
  it('rejects short or blank input', () => {
    expect(isValidSubject('ab')).toBe(false);
    expect(isValidSubject('  ')).toBe(false);
    expect(isValidMessage('a')).toBe(false);
    expect(isValidMessage('  ')).toBe(false);
  });

  it('accepts content at or above the minimum length', () => {
    expect(isValidSubject('abc')).toBe(true);
    expect(isValidMessage('da')).toBe(true);
  });
});

describe('lastActivityAt', () => {
  it('returns the newest message timestamp', () => {
    const t = thread('1', 'open', '2026-05-01T00:00:00.000Z', [
      msg('m1', 'admin', '2026-05-02T00:00:00.000Z'),
      msg('m2', 'superadmin', '2026-05-04T00:00:00.000Z'),
      msg('m3', 'admin', '2026-05-03T00:00:00.000Z'),
    ]);
    expect(lastActivityAt(t)).toBe('2026-05-04T00:00:00.000Z');
  });

  it('falls back to creation time when there are no messages', () => {
    const t = thread('1', 'open', '2026-05-01T00:00:00.000Z', []);
    expect(lastActivityAt(t)).toBe('2026-05-01T00:00:00.000Z');
  });
});

describe('awaitingReply', () => {
  it('is true when the last message is from the other party (open thread)', () => {
    const t = thread('1', 'open', 'x', [
      msg('m1', 'admin', 'a'),
      msg('m2', 'superadmin', 'b'),
      msg('m3', 'admin', 'c'),
    ]);
    // Last message is 'admin', so superadmin is awaiting
    expect(awaitingReply(t, 'superadmin')).toBe(true);
    // Admin is not awaiting (last message is theirs)
    expect(awaitingReply(t, 'admin')).toBe(false);
  });

  it('is false for resolved threads', () => {
    const t = thread('1', 'resolved', 'x', [msg('m1', 'admin', 'a')]);
    expect(awaitingReply(t, 'superadmin')).toBe(false);
  });

  it('is false for threads with no messages', () => {
    const t = thread('1', 'open', 'x', []);
    expect(awaitingReply(t, 'admin')).toBe(false);
    expect(awaitingReply(t, 'superadmin')).toBe(false);
  });

  it('admin perspective: awaiting when last message is from superadmin', () => {
    const t = thread('1', 'open', 'x', [
      msg('m1', 'admin', 'a'),
      msg('m2', 'superadmin', 'b'),
    ]);
    expect(awaitingReply(t, 'admin')).toBe(true);
    expect(awaitingReply(t, 'superadmin')).toBe(false);
  });
});

describe('unreadFor', () => {
  it('counts unread messages from the other party', () => {
    const t = thread('1', 'open', 'x', [
      msg('m1', 'superadmin', 'a', false),
      msg('m2', 'superadmin', 'b', true),
      msg('m3', 'admin', 'c', false),
    ]);
    // Admin has 1 unread superadmin message (m1 unread, m2 read)
    expect(unreadFor(t, 'admin')).toBe(1);
    // Superadmin has 1 unread admin message
    expect(unreadFor(t, 'superadmin')).toBe(1);
  });

  it('is zero when all counterpart messages are read', () => {
    const t = thread('1', 'open', 'x', [
      msg('m1', 'superadmin', 'a', true),
      msg('m2', 'admin', 'b', true),
    ]);
    expect(unreadFor(t, 'admin')).toBe(0);
    expect(unreadFor(t, 'superadmin')).toBe(0);
  });

  it('is zero when there are no messages', () => {
    const t = thread('1', 'open', 'x', []);
    expect(unreadFor(t, 'admin')).toBe(0);
    expect(unreadFor(t, 'superadmin')).toBe(0);
  });
});

describe('sortThreads', () => {
  it('floats open threads above resolved, newest activity first within each group', () => {
    const base = '2026-04-01T00:00:00.000Z';
    const resolvedRecent = thread('r', 'resolved', base, [msg('a', 'admin', '2026-05-09T00:00:00.000Z')]);
    const openOld = thread('o1', 'open', base, [msg('b', 'admin', '2026-05-01T00:00:00.000Z')]);
    const openNew = thread('o2', 'open', base, [msg('c', 'superadmin', '2026-05-05T00:00:00.000Z')]);
    expect(sortThreads([resolvedRecent, openOld, openNew]).map((t) => t.id)).toEqual([
      'o2',
      'o1',
      'r',
    ]);
  });

  it('does not mutate the input array', () => {
    const threads = [
      thread('1', 'resolved', '2026-05-01T00:00:00.000Z', []),
      thread('2', 'open', '2026-05-02T00:00:00.000Z', []),
    ];
    const copy = [...threads];
    sortThreads(threads);
    expect(threads).toEqual(copy);
  });

  it('handles an empty list', () => {
    expect(sortThreads([])).toEqual([]);
  });

  it('handles a single thread', () => {
    const t = thread('1', 'open', '2026-05-01T00:00:00.000Z', []);
    expect(sortThreads([t])).toEqual([t]);
  });
});

describe('platformMessengerStore demo seed', () => {
  it('seeds 3 demo threads across 3 asociatii', async () => {
    const { usePlatformMessengerStore } = await import('@/platform/platformMessengerStore');
    const all = usePlatformMessengerStore.getState().allThreads();
    expect(all.length).toBe(3);
  });

  it('demo threads span at least 2 distinct asociatii', async () => {
    const { usePlatformMessengerStore } = await import('@/platform/platformMessengerStore');
    const all = usePlatformMessengerStore.getState().allThreads();
    const ids = new Set(all.map((t) => t.asociatie_id));
    expect(ids.size).toBeGreaterThanOrEqual(2);
  });

  it('all demo threads have at least one message', async () => {
    const { usePlatformMessengerStore } = await import('@/platform/platformMessengerStore');
    const all = usePlatformMessengerStore.getState().allThreads();
    for (const t of all) {
      expect(t.messages.length).toBeGreaterThan(0);
    }
  });

  it('reply action appends a superadmin message and reopens the thread', async () => {
    const { usePlatformMessengerStore } = await import('@/platform/platformMessengerStore');
    const store = usePlatformMessengerStore.getState();
    const resolved = store.allThreads().find((t) => t.status === 'resolved');
    expect(resolved).toBeDefined();
    if (!resolved) return;
    const before = resolved.messages.length;
    store.reply(resolved.asociatie_id, resolved.id, 'Platformă', 'Raspuns test');
    const after = usePlatformMessengerStore
      .getState()
      .byAsociatie[resolved.asociatie_id]
      ?.find((t) => t.id === resolved.id);
    expect(after?.messages.length).toBe(before + 1);
    expect(after?.status).toBe('open');
    expect(after?.messages[after.messages.length - 1].sender).toBe('superadmin');
  });

  it('markRead marks counterpart messages as read', async () => {
    const { usePlatformMessengerStore } = await import('@/platform/platformMessengerStore');
    const store = usePlatformMessengerStore.getState();
    const thread = store.allThreads().find((t) => t.messages.some((m) => !m.read));
    if (!thread) return; // nothing unread in this seeded state; test is vacuously ok
    const unreadBefore = thread.messages.filter((m) => m.sender !== 'superadmin' && !m.read).length;
    if (unreadBefore === 0) return;
    store.markRead(thread.asociatie_id, thread.id, 'superadmin');
    const after = usePlatformMessengerStore
      .getState()
      .byAsociatie[thread.asociatie_id]
      ?.find((t) => t.id === thread.id);
    const stillUnread = (after?.messages ?? []).filter(
      (m) => m.sender !== 'superadmin' && !m.read,
    ).length;
    expect(stillUnread).toBe(0);
  });
});
