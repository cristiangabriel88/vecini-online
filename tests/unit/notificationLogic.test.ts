import { describe, it, expect } from 'vitest';
import {
  type AppNotification,
  createNotification,
  buildMembershipJoinedNotification,
  markNotificationRead,
  isUnread,
  notificationsFor,
  unreadCountFor,
  notifAgeMs,
} from '@/features/notifications/notificationLogic';

const BASE_NOW = 1_700_000_000_000; // fixed epoch for deterministic tests

function makeNotif(partial: Partial<AppNotification> = {}): AppNotification {
  return {
    id: 'test-notif-1',
    userId: 'u-1',
    asociatieId: 'asoc-1',
    kind: 'generic',
    title: 'Test title',
    body: 'Test body',
    link: null,
    priority: 'normal',
    readAt: null,
    createdAt: BASE_NOW,
    data: {},
    ...partial,
  };
}

describe('createNotification', () => {
  it('mints a unique id and sets readAt to null', () => {
    const n = createNotification(
      {
        userId: 'u-1',
        asociatieId: 'asoc-1',
        kind: 'generic',
        title: 'Hi',
        body: 'body',
        link: null,
        priority: 'normal',
        data: {},
      },
      BASE_NOW,
    );
    expect(n.id).toBeTruthy();
    expect(n.readAt).toBeNull();
    expect(n.createdAt).toBe(BASE_NOW);
  });

  it('preserves all input fields', () => {
    const n = createNotification(
      {
        userId: 'u-2',
        asociatieId: 'asoc-2',
        kind: 'membership.joined',
        title: '',
        body: '',
        link: '/app',
        priority: 'urgent',
        data: { name: 'Ana', role: 'locatar' },
      },
      BASE_NOW,
    );
    expect(n.userId).toBe('u-2');
    expect(n.asociatieId).toBe('asoc-2');
    expect(n.kind).toBe('membership.joined');
    expect(n.priority).toBe('urgent');
    expect(n.data.name).toBe('Ana');
    expect(n.data.role).toBe('locatar');
  });
});

describe('buildMembershipJoinedNotification', () => {
  it('targets the recipient and uses the invite role', () => {
    const n = buildMembershipJoinedNotification({
      recipientUserId: 'u-admin',
      asociatieId: 'asoc-1',
      memberName: 'Ion Popescu',
      memberRole: 'proprietar',
      now: BASE_NOW,
    });
    expect(n.userId).toBe('u-admin');
    expect(n.asociatieId).toBe('asoc-1');
    expect(n.kind).toBe('membership.joined');
    expect(n.data.name).toBe('Ion Popescu');
    expect(n.data.role).toBe('proprietar');
    expect(n.link).toBe('/app/admin/invitatii');
    expect(n.createdAt).toBe(BASE_NOW);
  });

  it('stores empty string for null memberName', () => {
    const n = buildMembershipJoinedNotification({
      recipientUserId: 'u-admin',
      asociatieId: 'asoc-1',
      memberName: null,
      memberRole: 'locatar',
      now: BASE_NOW,
    });
    expect(n.data.name).toBe('');
  });
});

describe('markNotificationRead', () => {
  it('stamps readAt with the provided now', () => {
    const n = makeNotif();
    const marked = markNotificationRead(n, BASE_NOW + 5000);
    expect(marked.readAt).toBe(BASE_NOW + 5000);
  });

  it('is idempotent (does not overwrite a non-null readAt)', () => {
    const n = makeNotif({ readAt: BASE_NOW });
    const again = markNotificationRead(n, BASE_NOW + 5000);
    expect(again.readAt).toBe(BASE_NOW); // original stamp preserved
  });

  it('does not mutate the original', () => {
    const n = makeNotif();
    markNotificationRead(n, BASE_NOW);
    expect(n.readAt).toBeNull();
  });
});

describe('isUnread', () => {
  it('returns true when readAt is null', () => {
    expect(isUnread(makeNotif())).toBe(true);
  });
  it('returns false when readAt is set', () => {
    expect(isUnread(makeNotif({ readAt: BASE_NOW }))).toBe(false);
  });
});

describe('notificationsFor', () => {
  const notifications: AppNotification[] = [
    makeNotif({ id: 'n1', userId: 'u-1', asociatieId: 'asoc-1', createdAt: BASE_NOW + 1000 }),
    makeNotif({ id: 'n2', userId: 'u-1', asociatieId: 'asoc-1', createdAt: BASE_NOW }),
    makeNotif({ id: 'n3', userId: 'u-2', asociatieId: 'asoc-1', createdAt: BASE_NOW }),
    makeNotif({ id: 'n4', userId: 'u-1', asociatieId: 'asoc-2', createdAt: BASE_NOW }),
  ];

  it('filters by userId and asociatieId', () => {
    const result = notificationsFor(notifications, 'u-1', 'asoc-1');
    expect(result.map((n) => n.id)).toEqual(['n1', 'n2']);
  });

  it('returns notifications newest first', () => {
    const result = notificationsFor(notifications, 'u-1', 'asoc-1');
    expect(result[0].createdAt).toBeGreaterThan(result[1].createdAt);
  });

  it('returns empty array when no match', () => {
    expect(notificationsFor(notifications, 'u-999', 'asoc-1')).toHaveLength(0);
  });

  it('does not include notifications for a different asociație', () => {
    const result = notificationsFor(notifications, 'u-1', 'asoc-1');
    expect(result.every((n) => n.asociatieId === 'asoc-1')).toBe(true);
  });
});

describe('unreadCountFor', () => {
  const notifications: AppNotification[] = [
    makeNotif({ id: 'n1', userId: 'u-1', asociatieId: 'asoc-1', readAt: null }),
    makeNotif({ id: 'n2', userId: 'u-1', asociatieId: 'asoc-1', readAt: BASE_NOW }),
    makeNotif({ id: 'n3', userId: 'u-1', asociatieId: 'asoc-1', readAt: null }),
    makeNotif({ id: 'n4', userId: 'u-2', asociatieId: 'asoc-1', readAt: null }),
  ];

  it('counts only unread notifications for the target user+asociație', () => {
    expect(unreadCountFor(notifications, 'u-1', 'asoc-1')).toBe(2);
  });

  it('returns 0 when all are read', () => {
    const all = notifications.map((n) => ({ ...n, readAt: BASE_NOW }));
    expect(unreadCountFor(all, 'u-1', 'asoc-1')).toBe(0);
  });

  it('does not count notifications for other users', () => {
    expect(unreadCountFor(notifications, 'u-2', 'asoc-1')).toBe(1);
  });
});

describe('notifAgeMs', () => {
  it('returns the positive elapsed milliseconds', () => {
    expect(notifAgeMs(BASE_NOW - 5000, BASE_NOW)).toBe(5000);
  });

  it('clamps to 0 when now is before createdAt', () => {
    expect(notifAgeMs(BASE_NOW + 1000, BASE_NOW)).toBe(0);
  });
});
