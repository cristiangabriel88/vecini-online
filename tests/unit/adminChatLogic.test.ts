import { describe, expect, it } from 'vitest';
import {
  awaitingReply,
  counterpartOf,
  isValidMessage,
  isValidSubject,
  lastActivityAt,
  sortThreads,
  threadParticipantLabel,
  toggledStatus,
  unreadFor,
  waitingHours,
} from '@/features/adminchat/adminChatLogic';
import type { PrivateMessage, PrivateSender, PrivateThread } from '@/shared/types/domain';

const msg = (
  id: string,
  sender: PrivateSender,
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
  over: Partial<PrivateThread> = {},
): PrivateThread => ({
  id,
  asociatie_id: 'a',
  resident_user_id: 'u-res',
  resident_name: 'Popescu Andrei',
  apartment_label: 'Ap. 5',
  subject: 'Subiect',
  status,
  created_at,
  messages,
  ...over,
});

describe('isValidSubject / isValidMessage', () => {
  it('require non-trivial trimmed content', () => {
    expect(isValidSubject('ok')).toBe(false);
    expect(isValidSubject('abc')).toBe(true);
    expect(isValidMessage(' ')).toBe(false);
    expect(isValidMessage('da')).toBe(true);
  });
});

describe('counterpartOf', () => {
  it('pairs each viewer with the other party', () => {
    expect(counterpartOf('admin')).toBe('resident');
    expect(counterpartOf('resident')).toBe('admin');
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
  it("is true only when open and the last message is the resident's", () => {
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
    expect(awaitingReply(thread('1', 'resolved', 'x', [msg('m1', 'resident', 'a')]))).toBe(false);
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

describe('unreadFor', () => {
  it('counts unread messages from the other party, per viewer', () => {
    const t = thread('1', 'open', 'x', [
      msg('m1', 'admin', 'a', false),
      msg('m2', 'admin', 'b', true),
      msg('m3', 'resident', 'c', false),
    ]);
    // The resident has one unread administrator message (the read one is excluded).
    expect(unreadFor(t, 'resident')).toBe(1);
    // The administrator has one unread resident message.
    expect(unreadFor(t, 'admin')).toBe(1);
  });

  it('is zero when everything from the other party is read', () => {
    const t = thread('1', 'open', 'x', [msg('m1', 'resident', 'a', true)]);
    expect(unreadFor(t, 'admin')).toBe(0);
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

describe('threadParticipantLabel', () => {
  it('shows the administrator label to a resident', () => {
    expect(threadParticipantLabel(thread('1', 'open', 'x', []), 'resident', 'Administrator')).toBe(
      'Administrator',
    );
  });

  it('shows the resident name and apartment to the administrator', () => {
    expect(threadParticipantLabel(thread('1', 'open', 'x', []), 'admin', 'Administrator')).toBe(
      'Popescu Andrei · Ap. 5',
    );
  });

  it('falls back to the name alone when no apartment is recorded', () => {
    const t = thread('1', 'open', 'x', [], { apartment_label: undefined });
    expect(threadParticipantLabel(t, 'admin', 'Administrator')).toBe('Popescu Andrei');
  });
});

describe('toggledStatus', () => {
  it('flips between open and resolved', () => {
    expect(toggledStatus('open')).toBe('resolved');
    expect(toggledStatus('resolved')).toBe('open');
  });
});
