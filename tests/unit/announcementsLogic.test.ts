import { describe, expect, it } from 'vitest';
import {
  addAnnouncementIn,
  announcementsForAsociatie,
  newAnnouncement,
  seedAnnouncements,
} from '@/features/announcements/announcementsLogic';
import { DEMO_ANNOUNCEMENTS, DEMO_ASOCIATIE } from '@/shared/demo/demoData';

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
