import { describe, expect, it } from 'vitest';
import {
  buildAnnouncementWidget,
  buildEventWidget,
  buildPollWidget,
  buildTicketWidget,
  widgetForFeature,
} from '../../src/features/home/homeWidgets';
import type { Announcement, BuildingEvent, Poll, Ticket } from '../../src/shared/types/domain';

const NOW = '2026-06-04T12:00:00Z';

const ann = (overrides: Partial<Announcement> = {}): Announcement => ({
  id: 'a1',
  asociatie_id: 'asoc',
  author_user_id: 'u1',
  title: 'Test anunț',
  body_html: '<p>Body</p>',
  category: 'informativ',
  audience: { type: 'all' },
  scheduled_at: null,
  published_at: '2026-06-03T10:00:00Z',
  expires_at: null,
  created_at: '2026-06-03T09:00:00Z',
  updated_at: '2026-06-03T09:00:00Z',
  ...overrides,
});

const event = (overrides: Partial<BuildingEvent> = {}): BuildingEvent => ({
  id: 'ev1',
  asociatie_id: 'asoc',
  title: 'Adunarea Generală',
  description: null,
  location: null,
  starts_at: '2026-06-05T18:00:00Z',
  ends_at: null,
  category: null,
  created_by: 'u1',
  created_at: '2026-06-01T09:00:00Z',
  ...overrides,
});

const poll = (overrides: Partial<Poll> = {}): Poll => ({
  id: 'p1',
  asociatie_id: 'asoc',
  author_user_id: 'u1',
  title: 'Vot buget',
  description: null,
  poll_type: 'yes_no',
  weighted: false,
  quorum_percent: 0,
  majority_rule: 'simple',
  opens_at: null,
  closes_at: null,
  audience: { type: 'all' },
  created_at: '2026-06-01T09:00:00Z',
  published_at: '2026-06-02T09:00:00Z',
  closed_at: null,
  ...overrides,
});

const ticket = (overrides: Partial<Ticket> = {}): Ticket => ({
  id: 't1',
  asociatie_id: 'asoc',
  reporter_user_id: 'u-res',
  apartment_id: 'ap-1',
  title: 'Gogoașă',
  description: '',
  category: 'other',
  severity: 'low',
  location_scara: null,
  location_etaj: null,
  location_description: null,
  status: 'primit',
  assigned_to_user_id: null,
  sla_due_at: null,
  resolved_at: null,
  verified_at: null,
  resolution_notes: null,
  rating: null,
  created_at: '2026-06-01T09:00:00Z',
  updated_at: '2026-06-01T09:00:00Z',
  ...overrides,
});

// --- buildAnnouncementWidget ---

describe('buildAnnouncementWidget', () => {
  it('returns null for empty list', () => {
    expect(buildAnnouncementWidget([])).toBeNull();
  });

  it('returns null when all announcements are unpublished', () => {
    expect(buildAnnouncementWidget([ann({ published_at: null })])).toBeNull();
  });

  it('returns the latest published announcement', () => {
    const result = buildAnnouncementWidget([
      ann({ id: 'a1', title: 'Older', published_at: '2026-06-01T10:00:00Z' }),
      ann({ id: 'a2', title: 'Newer', published_at: '2026-06-03T10:00:00Z' }),
    ]);
    expect(result).toMatchObject({ kind: 'announcement', title: 'Newer' });
  });

  it('includes the published_at date', () => {
    const result = buildAnnouncementWidget([ann()]);
    expect(result).toMatchObject({ kind: 'announcement', date: '2026-06-03T10:00:00Z' });
  });
});

// --- buildEventWidget ---

describe('buildEventWidget', () => {
  it('returns null for empty list', () => {
    expect(buildEventWidget([], NOW)).toBeNull();
  });

  it('returns null when all events are in the past', () => {
    expect(buildEventWidget([event({ starts_at: '2026-06-03T10:00:00Z' })], NOW)).toBeNull();
  });

  it('returns the soonest upcoming event', () => {
    const result = buildEventWidget(
      [
        event({ id: 'ev2', title: 'Later', starts_at: '2026-06-10T18:00:00Z' }),
        event({ id: 'ev1', title: 'Sooner', starts_at: '2026-06-05T18:00:00Z' }),
      ],
      NOW,
    );
    expect(result).toMatchObject({ kind: 'event', title: 'Sooner' });
  });

  it('includes the starts_at timestamp', () => {
    const result = buildEventWidget([event()], NOW);
    expect(result).toMatchObject({ startsAt: '2026-06-05T18:00:00Z' });
  });
});

// --- buildPollWidget ---

describe('buildPollWidget', () => {
  it('returns null for empty list', () => {
    expect(buildPollWidget([], NOW)).toBeNull();
  });

  it('returns null when poll is not yet published', () => {
    expect(buildPollWidget([poll({ published_at: null })], NOW)).toBeNull();
  });

  it('returns null when poll is already closed', () => {
    expect(buildPollWidget([poll({ closed_at: '2026-06-01T09:00:00Z' })], NOW)).toBeNull();
  });

  it('returns null when poll window has not opened yet', () => {
    expect(buildPollWidget([poll({ opens_at: '2026-06-05T00:00:00Z' })], NOW)).toBeNull();
  });

  it('returns null when poll window has closed', () => {
    expect(buildPollWidget([poll({ closes_at: '2026-06-03T00:00:00Z' })], NOW)).toBeNull();
  });

  it('returns count and firstTitle for one active poll', () => {
    const result = buildPollWidget([poll({ title: 'Vot buget' })], NOW);
    expect(result).toMatchObject({ kind: 'polls', count: 1, firstTitle: 'Vot buget' });
  });

  it('counts multiple active polls', () => {
    const result = buildPollWidget([poll({ id: 'p1' }), poll({ id: 'p2' })], NOW);
    expect(result).toMatchObject({ kind: 'polls', count: 2 });
  });
});

// --- buildTicketWidget ---

describe('buildTicketWidget', () => {
  it('returns null for empty list', () => {
    expect(buildTicketWidget([], 'u-res')).toBeNull();
  });

  it('returns null when all tickets belong to other users', () => {
    expect(buildTicketWidget([ticket({ reporter_user_id: 'u-other' })], 'u-res')).toBeNull();
  });

  it('returns null when all own tickets are terminal', () => {
    expect(buildTicketWidget([ticket({ status: 'inchis' }), ticket({ id: 't2', status: 'verificat' })], 'u-res')).toBeNull();
  });

  it('counts open tickets for the current user', () => {
    const result = buildTicketWidget(
      [
        ticket({ id: 't1', status: 'primit' }),
        ticket({ id: 't2', status: 'asignat' }),
        ticket({ id: 't3', reporter_user_id: 'u-other', status: 'primit' }),
      ],
      'u-res',
    );
    expect(result).toMatchObject({ kind: 'open_tickets', count: 2 });
  });

  it('excludes resolved/respins tickets from count', () => {
    const result = buildTicketWidget(
      [ticket({ status: 'primit' }), ticket({ id: 't2', status: 'rezolvat' })],
      'u-res',
    );
    expect(result).toMatchObject({ kind: 'open_tickets', count: 1 });
  });
});

// --- widgetForFeature ---

describe('widgetForFeature', () => {
  const src = {
    announcements: [ann()],
    events: [event()],
    polls: [poll()],
    tickets: [ticket()],
    userId: 'u-res',
    nowIso: NOW,
  };

  it('returns announcement widget for F01', () => {
    expect(widgetForFeature('F01', src)?.kind).toBe('announcement');
  });

  it('returns event widget for F08', () => {
    expect(widgetForFeature('F08', src)?.kind).toBe('event');
  });

  it('returns polls widget for F09', () => {
    expect(widgetForFeature('F09', src)?.kind).toBe('polls');
  });

  it('returns ticket widget for F17', () => {
    expect(widgetForFeature('F17', src)?.kind).toBe('open_tickets');
  });

  it('returns null for feature without a widget', () => {
    expect(widgetForFeature('F02', src)).toBeNull();
  });
});
