import { beforeEach, describe, expect, it } from 'vitest';
import type { Announcement } from '@/shared/types/domain';
import { useAnnouncementsStore } from '@/features/announcements/announcementsStore';
import { hydrateAnnouncements, loadOlderAnnouncements, publishAnnouncement } from '@/features/announcements/announcementsApi';

// announcementsApi offline-path tests (T57).
// Live-path tests require a real Supabase backend; the offline path
// (isSupabaseConfigured === false) is what CI exercises here. Key contracts:
//   - hydrateAnnouncements: no-op when not configured (store untouched)
//   - publishAnnouncement: prepends a well-formed announcement to the store

const DEMO_ASOC = 'asoc-test';

const SEED: Announcement[] = [
  {
    id: 'a-1',
    asociatie_id: DEMO_ASOC,
    author_user_id: 'u-admin',
    title: 'First',
    body_html: '<p>First body</p>',
    category: 'informativ',
    audience: { type: 'all' },
    scheduled_at: null,
    published_at: '2026-01-01T10:00:00.000Z',
    expires_at: null,
    created_at: '2026-01-01T10:00:00.000Z',
    updated_at: '2026-01-01T10:00:00.000Z',
  },
];

beforeEach(() => {
  useAnnouncementsStore.setState({ byAsociatie: { [DEMO_ASOC]: [...SEED] }, reads: {} });
});

describe('useAnnouncementsStore — replaceForAsociatie', () => {
  it('replaces the list for one asociație', () => {
    const fresh: Announcement[] = [
      {
        id: 'a-99',
        asociatie_id: DEMO_ASOC,
        author_user_id: 'u-admin',
        title: 'Fresh',
        body_html: '<p>Fresh</p>',
        category: 'urgent',
        audience: { type: 'all' },
        scheduled_at: null,
        published_at: '2026-01-02T10:00:00.000Z',
        expires_at: null,
        created_at: '2026-01-02T10:00:00.000Z',
        updated_at: '2026-01-02T10:00:00.000Z',
      },
    ];
    useAnnouncementsStore.getState().replaceForAsociatie(DEMO_ASOC, fresh);
    expect(useAnnouncementsStore.getState().byAsociatie[DEMO_ASOC]).toHaveLength(1);
    expect(useAnnouncementsStore.getState().byAsociatie[DEMO_ASOC][0].id).toBe('a-99');
  });

  it('does not touch other asociatii', () => {
    useAnnouncementsStore.getState().replaceForAsociatie('other-asoc', []);
    expect(useAnnouncementsStore.getState().byAsociatie[DEMO_ASOC]).toHaveLength(1);
  });

  it('replaceForAsociatie with empty array clears the list', () => {
    useAnnouncementsStore.getState().replaceForAsociatie(DEMO_ASOC, []);
    expect(useAnnouncementsStore.getState().byAsociatie[DEMO_ASOC]).toHaveLength(0);
  });
});

describe('hydrateAnnouncements', () => {
  it('is a no-op when Supabase is not configured (offline/CI)', async () => {
    const before = useAnnouncementsStore.getState().byAsociatie[DEMO_ASOC];
    await hydrateAnnouncements(DEMO_ASOC);
    expect(useAnnouncementsStore.getState().byAsociatie[DEMO_ASOC]).toBe(before);
  });

  it('is a no-op when asociatieId is empty', async () => {
    const before = useAnnouncementsStore.getState().byAsociatie[DEMO_ASOC];
    await hydrateAnnouncements('');
    expect(useAnnouncementsStore.getState().byAsociatie[DEMO_ASOC]).toBe(before);
  });
});

describe('publishAnnouncement', () => {
  it('prepends a new announcement to the store', () => {
    publishAnnouncement(DEMO_ASOC, 'u-admin', {
      title: 'New notice',
      body_html: '<p>Body</p>',
      category: 'important',
    });
    const items = useAnnouncementsStore.getState().byAsociatie[DEMO_ASOC];
    expect(items).toHaveLength(2);
    expect(items[0].title).toBe('New notice');
    expect(items[0].category).toBe('important');
    expect(items[0].asociatie_id).toBe(DEMO_ASOC);
    expect(items[0].author_user_id).toBe('u-admin');
  });

  it('keeps pre-existing announcements after publish', () => {
    publishAnnouncement(DEMO_ASOC, 'u-admin', {
      title: 'Second',
      body_html: '<p>x</p>',
      category: 'informativ',
    });
    const items = useAnnouncementsStore.getState().byAsociatie[DEMO_ASOC];
    expect(items.map((a) => a.title)).toContain('First');
    expect(items.map((a) => a.title)).toContain('Second');
  });

  it('multiple publishes all land in the store', () => {
    publishAnnouncement(DEMO_ASOC, 'u-admin', {
      title: 'A',
      body_html: '<p>a</p>',
      category: 'informativ',
    });
    publishAnnouncement(DEMO_ASOC, 'u-admin', {
      title: 'B',
      body_html: '<p>b</p>',
      category: 'urgent',
    });
    const items = useAnnouncementsStore.getState().byAsociatie[DEMO_ASOC];
    expect(items).toHaveLength(3);
  });

  it('published_at is set to a non-null ISO string', () => {
    publishAnnouncement(DEMO_ASOC, 'u-admin', {
      title: 'Timed',
      body_html: '<p>x</p>',
      category: 'eveniment',
    });
    const item = useAnnouncementsStore.getState().byAsociatie[DEMO_ASOC][0];
    expect(item.published_at).not.toBeNull();
    expect(new Date(item.published_at!).getTime()).toBeGreaterThan(0);
  });

  it('holds back a future-scheduled announcement (published_at null)', () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    publishAnnouncement(DEMO_ASOC, 'u-admin', {
      title: 'Scheduled',
      body_html: '<p>x</p>',
      category: 'important',
      scheduled_at: future,
    });
    const item = useAnnouncementsStore.getState().byAsociatie[DEMO_ASOC][0];
    expect(item.published_at).toBeNull();
    expect(item.scheduled_at).toBe(future);
  });

  it('carries offline attachments onto the stored announcement', () => {
    publishAnnouncement(DEMO_ASOC, 'u-admin', {
      title: 'With file',
      body_html: '<p>x</p>',
      category: 'informativ',
      attachments: [
        {
          id: 'att-1',
          file_name: 'plan.pdf',
          file_size: 1234,
          file_type: 'application/pdf',
          storage_path: null,
          file_data_url: 'data:application/pdf;base64,AAAA',
        },
      ],
    });
    const item = useAnnouncementsStore.getState().byAsociatie[DEMO_ASOC][0];
    expect(item.attachments).toHaveLength(1);
    expect(item.attachments![0].file_name).toBe('plan.pdf');
    expect(item.attachments![0].file_data_url).toContain('data:application/pdf');
  });
});

describe('useAnnouncementsStore — appendForAsociatie (T299)', () => {
  it('appends items at the end of the existing list', () => {
    const older: Announcement = {
      id: 'a-old',
      asociatie_id: DEMO_ASOC,
      author_user_id: 'u-admin',
      title: 'Older',
      body_html: '<p>Older</p>',
      category: 'informativ',
      audience: { type: 'all' },
      scheduled_at: null,
      published_at: '2025-12-01T10:00:00.000Z',
      expires_at: null,
      created_at: '2025-12-01T10:00:00.000Z',
      updated_at: '2025-12-01T10:00:00.000Z',
    };
    useAnnouncementsStore.getState().appendForAsociatie(DEMO_ASOC, [older]);
    const items = useAnnouncementsStore.getState().byAsociatie[DEMO_ASOC];
    expect(items).toHaveLength(2);
    expect(items[0].id).toBe('a-1');
    expect(items[1].id).toBe('a-old');
  });

  it('does not touch other asociatii', () => {
    useAnnouncementsStore.getState().appendForAsociatie('other-asoc', []);
    expect(useAnnouncementsStore.getState().byAsociatie[DEMO_ASOC]).toHaveLength(1);
  });

  it('creates the list when the asociatie had no entries yet', () => {
    useAnnouncementsStore.getState().appendForAsociatie('new-asoc', [SEED[0]]);
    expect(useAnnouncementsStore.getState().byAsociatie['new-asoc']).toHaveLength(1);
  });
});

describe('hydrateAnnouncements — pagination contract (T299)', () => {
  it('returns hasMore: false when backend is not configured', async () => {
    const result = await hydrateAnnouncements(DEMO_ASOC);
    expect(result.hasMore).toBe(false);
  });

  it('returns hasMore: false when asociatieId is empty', async () => {
    const result = await hydrateAnnouncements('');
    expect(result.hasMore).toBe(false);
  });
});

describe('loadOlderAnnouncements — offline no-op (T299)', () => {
  it('returns hasMore: false and does not modify the store when offline', async () => {
    const before = useAnnouncementsStore.getState().byAsociatie[DEMO_ASOC];
    const result = await loadOlderAnnouncements(DEMO_ASOC, '2026-01-01T00:00:00.000Z');
    expect(result.hasMore).toBe(false);
    expect(useAnnouncementsStore.getState().byAsociatie[DEMO_ASOC]).toBe(before);
  });
});
