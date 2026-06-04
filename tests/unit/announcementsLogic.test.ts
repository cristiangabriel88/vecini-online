import { describe, expect, it } from 'vitest';
import {
  ATTACHMENT_MAX_BYTES,
  addAnnouncementIn,
  announcementsForAsociatie,
  canManageAnnouncements,
  isAnnouncementDue,
  isScheduledPending,
  newAnnouncement,
  seedAnnouncements,
  validateAttachmentFile,
  visibleAnnouncements,
} from '@/features/announcements/announcementsLogic';
import type { Announcement } from '@/shared/types/domain';
import { DEMO_ANNOUNCEMENTS, DEMO_ASOCIATIE } from '@/shared/demo/demoData';

function ann(over: Partial<Announcement>): Announcement {
  return {
    id: 'x',
    asociatie_id: 'a',
    author_user_id: 'u',
    title: 't',
    body_html: '<p>b</p>',
    category: 'informativ',
    audience: { type: 'all' },
    scheduled_at: null,
    published_at: null,
    expires_at: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...over,
  };
}

describe('announcementsLogic', () => {
  it('seeds the demo asociație with the seeded announcements', () => {
    const seed = seedAnnouncements();
    expect(seed[DEMO_ASOCIATIE.id]).toEqual(DEMO_ANNOUNCEMENTS);
  });

  it('returns the stored announcements for a known asociație', () => {
    const seed = seedAnnouncements();
    expect(announcementsForAsociatie(seed, DEMO_ASOCIATIE.id)).toEqual(DEMO_ANNOUNCEMENTS);
  });

  it('returns an empty list for an unknown or null asociație', () => {
    const seed = seedAnnouncements();
    expect(announcementsForAsociatie(seed, 'asoc-unknown')).toEqual([]);
    expect(announcementsForAsociatie(seed, null)).toEqual([]);
  });

  it('returns a stable reference for the empty default (no needless re-renders)', () => {
    const seed = seedAnnouncements();
    expect(announcementsForAsociatie(seed, 'x')).toBe(announcementsForAsociatie(seed, 'y'));
    expect(announcementsForAsociatie(seed, null)).toBe(announcementsForAsociatie({}, null));
  });

  it('builds a published announcement owned by the asociație and author', () => {
    const now = new Date('2026-05-23T10:00:00Z');
    const a = newAnnouncement(
      { title: 'Test', body_html: '<p>Salut</p>', category: 'informativ' },
      'asoc-b',
      'u-1',
      now,
    );
    expect(a.asociatie_id).toBe('asoc-b');
    expect(a.author_user_id).toBe('u-1');
    expect(a.title).toBe('Test');
    expect(a.category).toBe('informativ');
    expect(a.audience).toEqual({ type: 'all' });
    expect(a.published_at).toBe(now.toISOString());
    expect(a.scheduled_at).toBeNull();
  });

  it('id is a valid UUID so Supabase uuid column accepts it', () => {
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const a = newAnnouncement({ title: 'T', body_html: '<p>x</p>', category: 'informativ' }, 'a', 'u');
    const b = newAnnouncement({ title: 'T', body_html: '<p>x</p>', category: 'informativ' }, 'a', 'u');
    expect(a.id).toMatch(UUID_RE);
    expect(b.id).toMatch(UUID_RE);
    expect(a.id).not.toBe(b.id);
  });

  it('addAnnouncementIn prepends, is pure, and is scoped per asociație', () => {
    const before = seedAnnouncements();
    const snapshot = JSON.parse(JSON.stringify(before));
    const a = newAnnouncement(
      { title: 'Nou', body_html: '<p>x</p>', category: 'urgent' },
      'asoc-b',
      'u-1',
      new Date('2026-05-23T10:00:00Z'),
    );
    const next = addAnnouncementIn(before, 'asoc-b', a);

    expect(next).not.toBe(before);
    expect(before).toEqual(snapshot); // input untouched
    expect(announcementsForAsociatie(next, 'asoc-b')[0]).toBe(a); // newest first
    // The demo asociație's list is unaffected by a publish into asoc-b.
    expect(announcementsForAsociatie(next, DEMO_ASOCIATIE.id)).toEqual(DEMO_ANNOUNCEMENTS);
  });
});

describe('canManageAnnouncements', () => {
  it('allows admin, presedinte, comitet', () => {
    expect(canManageAnnouncements('admin')).toBe(true);
    expect(canManageAnnouncements('presedinte')).toBe(true);
    expect(canManageAnnouncements('comitet')).toBe(true);
  });
  it('denies residents and null', () => {
    expect(canManageAnnouncements('proprietar')).toBe(false);
    expect(canManageAnnouncements('locatar')).toBe(false);
    expect(canManageAnnouncements(null)).toBe(false);
  });
});

describe('validateAttachmentFile', () => {
  it('accepts a PDF and images under the limit', () => {
    expect(validateAttachmentFile({ size: 1024, type: 'application/pdf' })).toBeNull();
    expect(validateAttachmentFile({ size: 1024, type: 'image/png' })).toBeNull();
    expect(validateAttachmentFile({ size: 1024, type: 'image/jpeg' })).toBeNull();
  });
  it('rejects oversize files and disallowed types', () => {
    expect(validateAttachmentFile({ size: ATTACHMENT_MAX_BYTES + 1, type: 'application/pdf' })).toBe('too_large');
    expect(validateAttachmentFile({ size: 100, type: 'application/zip' })).toBe('bad_type');
    expect(validateAttachmentFile({ size: 100, type: 'video/mp4' })).toBe('bad_type');
  });
});

describe('newAnnouncement scheduling + attachments', () => {
  const now = new Date('2026-05-23T10:00:00Z');

  it('publishes immediately when no schedule is given', () => {
    const a = newAnnouncement({ title: 'T', body_html: '<p>x</p>', category: 'informativ' }, 'a', 'u', now);
    expect(a.published_at).toBe(now.toISOString());
    expect(a.scheduled_at).toBeNull();
    expect(a.attachments).toEqual([]);
  });

  it('holds back a future-scheduled announcement (published_at null)', () => {
    const future = '2026-05-24T10:00:00.000Z';
    const a = newAnnouncement(
      { title: 'T', body_html: '<p>x</p>', category: 'informativ', scheduled_at: future },
      'a', 'u', now,
    );
    expect(a.published_at).toBeNull();
    expect(a.scheduled_at).toBe(future);
  });

  it('publishes now when the scheduled time is already in the past', () => {
    const past = '2026-05-22T10:00:00.000Z';
    const a = newAnnouncement(
      { title: 'T', body_html: '<p>x</p>', category: 'informativ', scheduled_at: past },
      'a', 'u', now,
    );
    expect(a.published_at).toBe(now.toISOString());
    expect(a.scheduled_at).toBeNull();
  });

  it('carries provided attachments', () => {
    const att = [{ id: 'att-1', file_name: 'f.pdf', file_size: 10, file_type: 'application/pdf', storage_path: null, file_data_url: 'data:,' }];
    const a = newAnnouncement(
      { title: 'T', body_html: '<p>x</p>', category: 'informativ', attachments: att }, 'a', 'u', now,
    );
    expect(a.attachments).toEqual(att);
  });
});

describe('scheduling visibility helpers', () => {
  const now = new Date('2026-05-23T10:00:00Z');

  it('isAnnouncementDue: published rows and past-scheduled rows are due', () => {
    expect(isAnnouncementDue(ann({ published_at: '2026-05-01T00:00:00.000Z' }), now)).toBe(true);
    expect(isAnnouncementDue(ann({ scheduled_at: '2026-05-22T00:00:00.000Z' }), now)).toBe(true);
    expect(isAnnouncementDue(ann({ scheduled_at: '2026-05-24T00:00:00.000Z' }), now)).toBe(false);
    expect(isAnnouncementDue(ann({}), now)).toBe(false);
  });

  it('isScheduledPending: only future-scheduled, unpublished rows', () => {
    expect(isScheduledPending(ann({ scheduled_at: '2026-05-24T00:00:00.000Z' }), now)).toBe(true);
    expect(isScheduledPending(ann({ scheduled_at: '2026-05-22T00:00:00.000Z' }), now)).toBe(false);
    expect(isScheduledPending(ann({ published_at: '2026-05-01T00:00:00.000Z' }), now)).toBe(false);
  });

  it('visibleAnnouncements hides future-scheduled rows from residents', () => {
    const list = [
      ann({ id: 'due', published_at: '2026-05-01T00:00:00.000Z' }),
      ann({ id: 'pending', scheduled_at: '2026-05-24T00:00:00.000Z' }),
    ];
    expect(visibleAnnouncements(list, now).map((a) => a.id)).toEqual(['due']);
  });
});
