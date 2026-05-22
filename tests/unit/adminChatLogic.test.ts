import { describe, expect, it } from 'vitest';
import {
  awaitingReply,
  isValidMessage,
  isValidSubject,
  lastActivityAt,
  sortThreads,
  toggledStatus,
  unreadFromAdmin,
  waitingHours,
} from '@/features/adminchat/adminChatLogic';
import type { PrivateMessage, PrivateThread } from '@/shared/types/domain';

const msg = (
  id: string,
  sender: 'resident' | 'admin',
  created_at: string,
  read = true,
): PrivateMessage => ({
  id,
  thread_id: 't',
  sender,
  sender_name: sender,
  body: 'salut',
  created_at,
  read,
});

const thread = (
  id: string,
  status: 'open' | 'resolved',
  created_at: string,
  messages: PrivateMessage[],
): PrivateThread => ({
  id,
  asociatie_id: 'a',
  resident_user_id: 'u-res',
  resident_name: 'Andrei',
  subject: 'Subiect',
  status,
  created_at,
  messages,
});

describe('isValidSubject / isValidMessage', () => {
  it('require non-trivial trimmed content', () => {
    expect(isValidSubject('ok')).toBe(false);
    expect(isValidSubject('abc')).toBe(true);
    expect(isValidMessage(' ')).toBe(false);
    expect(isValidMessage('da')).toBe(true);
  });
});

describe('lastActivityAt', () => {
  it('returns the newest message timestamp', () => {
    const t = thread('1', 'open', '2026-05-01T00:00:00.000Z', [
      msg('m1', 'resident', '2026-05-02T00:00:00.000Z'),
      msg('m2', 'admin', '2026-05-04T00:00:00.000Z'),
      msg('m3', 'resident', '2026-05-03T00:00:00.000Z'),
    ]);
    expect(lastActivityAt(t)).toBe('2026-05-04T00:00:00.000Z');
  });

  it('falls back to the creation time when there are no messages', () => {
    expect(lastActivityAt(thread('1', 'open', '2026-05-01T00:00:00.000Z', []))).toBe(
      '2026-05-01T00:00:00.000Z',
    );
  });
});

describe('awaitingReply', () => {
  it('is true only when open and the last message is the resident\'s', () => {
    expect(
      awaitingReply(
        thread('1', 'open', 'x', [msg('m1', 'admin', 'a'), msg('m2', 'resident', 'b')]),
      ),
    ).toBe(true);
    expect(
      awaitingReply(
        thread('1', 'open', 'x', [msg('m1', 'resident', 'a'), msg('m2', 'admin', 'b')]),
      ),
    ).toBe(false);
    expect(
      awaitingReply(
        thread('1', 'resolved', 'x', [msg('m1', 'resident', 'a')]),
      ),
    ).toBe(false);
    expect(awaitingReply(thread('1', 'open', 'x', []))).toBe(false);
  });
});

describe('waitingHours', () => {
  it('counts whole hours since the last resident message when awaiting', () => {
    const now = new Date('2026-05-02T00:00:00.000Z');
    const t = thread('1', 'open', 'x', [msg('m1', 'resident', '2026-05-01T20:30:00.000Z')]);
    expect(waitingHours(t, now)).toBe(3);
  });

  it('is 0 when not awaiting a reply', () => {
    const now = new Date('2026-05-02T00:00:00.000Z');
    const t = thread('1', 'open', 'x', [msg('m1', 'admin', '2026-05-01T00:00:00.000Z')]);
    expect(waitingHours(t, now)).toBe(0);
  });
});

describe('unreadFromAdmin', () => {
  it('counts only unread admin messages', () => {
    const t = thread('1', 'open', 'x', [
      msg('m1', 'admin', 'a', false),
      msg('m2', 'admin', 'b', true),
      msg('m3', 'resident', 'c', false),
    ]);
    expect(unreadFromAdmin(t)).toBe(1);
  });
});

describe('sortThreads', () => {
  it('floats open threads above resolved, newest activity first within each', () => {
    const base = '2026-04-01T00:00:00.000Z';
    const resolvedRecent = thread('r', 'resolved', base, [msg('a', 'admin', '2026-05-09T00:00:00.000Z')]);
    const openOld = thread('o1', 'open', base, [msg('b', 'resident', '2026-05-01T00:00:00.000Z')]);
    const openNew = thread('o2', 'open', base, [msg('c', 'resident', '2026-05-05T00:00:00.000Z')]);
    expect(sortThreads([resolvedRecent, openOld, openNew]).map((t) => t.id)).toEqual([
      'o2',
      'o1',
      'r',
    ]);
  });
});

describe('toggledStatus', () => {
  it('flips between open and resolved', () => {
    expect(toggledStatus('open')).toBe('resolved');
    expect(toggledStatus('resolved')).toBe('open');
  });
});
