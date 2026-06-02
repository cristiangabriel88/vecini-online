import { describe, it, expect } from 'vitest';
import { rowToNotif, notifToRow } from '@/features/notifications/notificationsApi';
import type { AppNotification } from '@/features/notifications/notificationLogic';

const BASE_MS = 1_700_000_000_000;
const BASE_ISO = new Date(BASE_MS).toISOString();
const READ_MS = BASE_MS + 60_000;
const READ_ISO = new Date(READ_MS).toISOString();

const FULL_NOTIF: AppNotification = {
  id: 'notif-test-1',
  userId: 'u-admin',
  asociatieId: 'asoc-1',
  kind: 'membership.joined',
  title: '',
  body: '',
  link: '/app/admin/invitatii',
  priority: 'normal',
  readAt: null,
  createdAt: BASE_MS,
  data: { name: 'Ion Popescu', role: 'proprietar' },
};

describe('rowToNotif', () => {
  it('maps all fields from a DB row to AppNotification', () => {
    const row = {
      id: 'notif-test-1',
      user_id: 'u-admin',
      asociatie_id: 'asoc-1',
      kind: 'membership.joined',
      title: '',
      body: '',
      link: '/app/admin/invitatii',
      priority: 'normal',
      read_at: null,
      created_at: BASE_ISO,
      data: { name: 'Ion Popescu', role: 'proprietar' },
    };
    const n = rowToNotif(row);
    expect(n.id).toBe('notif-test-1');
    expect(n.userId).toBe('u-admin');
    expect(n.asociatieId).toBe('asoc-1');
    expect(n.kind).toBe('membership.joined');
    expect(n.readAt).toBeNull();
    expect(n.createdAt).toBe(BASE_MS);
    expect(n.data).toEqual({ name: 'Ion Popescu', role: 'proprietar' });
  });

  it('converts read_at timestamp string to epoch ms', () => {
    const row = {
      id: 'notif-2',
      user_id: 'u-1',
      asociatie_id: 'asoc-1',
      kind: 'generic',
      title: 'T',
      body: 'B',
      link: null,
      priority: 'low',
      read_at: READ_ISO,
      created_at: BASE_ISO,
      data: {},
    };
    const n = rowToNotif(row);
    expect(n.readAt).toBe(READ_MS);
  });

  it('handles null asociatie_id', () => {
    const row = {
      id: 'notif-3',
      user_id: 'u-1',
      asociatie_id: null,
      kind: 'generic',
      title: '',
      body: '',
      link: null,
      priority: 'normal',
      read_at: null,
      created_at: BASE_ISO,
      data: {},
    };
    expect(rowToNotif(row).asociatieId).toBeNull();
  });
});

describe('notifToRow', () => {
  it('maps all fields from AppNotification to a DB row', () => {
    const row = notifToRow(FULL_NOTIF);
    expect(row.id).toBe('notif-test-1');
    expect(row.user_id).toBe('u-admin');
    expect(row.asociatie_id).toBe('asoc-1');
    expect(row.kind).toBe('membership.joined');
    expect(row.read_at).toBeNull();
    expect(new Date(row.created_at).getTime()).toBe(BASE_MS);
    expect(row.data).toEqual({ name: 'Ion Popescu', role: 'proprietar' });
  });

  it('converts non-null readAt to ISO string', () => {
    const n = { ...FULL_NOTIF, readAt: READ_MS };
    const row = notifToRow(n);
    expect(row.read_at).toBe(READ_ISO);
  });

  it('roundtrips through rowToNotif without data loss', () => {
    const n = { ...FULL_NOTIF, readAt: READ_MS };
    const roundtripped = rowToNotif(notifToRow(n));
    expect(roundtripped.id).toBe(n.id);
    expect(roundtripped.userId).toBe(n.userId);
    expect(roundtripped.readAt).toBe(n.readAt);
    expect(roundtripped.createdAt).toBe(n.createdAt);
    expect(roundtripped.data).toEqual(n.data);
  });

  it('preserves null link', () => {
    const n = { ...FULL_NOTIF, link: null };
    expect(notifToRow(n).link).toBeNull();
  });
});
