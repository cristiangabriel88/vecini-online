import { describe, it, expect, beforeEach } from 'vitest';
import type { Ticket, DiscussionThread } from '@/shared/types/domain';
import { emitTicketStatusChanged, emitDiscussionReply } from '@/features/notifications/notificationFanout';
import { useNotificationStore } from '@/shared/store/notificationStore';

const BASE_NOW = 1_700_000_000_000;

function makeTicket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: 't-1',
    asociatie_id: 'asoc-1',
    reporter_user_id: 'user-reporter',
    apartment_id: null,
    title: 'Infiltratie',
    description: 'Desc',
    category: 'apa',
    severity: 'medium',
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
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeThread(overrides: Partial<DiscussionThread> = {}): DiscussionThread {
  return {
    id: 'dt-1',
    asociatie_id: 'asoc-1',
    topic: '#general',
    title: 'Parcare',
    pinned: false,
    created_at: '2026-01-01T00:00:00Z',
    messages: [
      {
        id: 'dm-1',
        thread_id: 'dt-1',
        author_user_id: 'user-thread-author',
        author_name: 'Ion',
        body: 'Prima',
        created_at: '2026-01-01T00:00:00Z',
      },
    ],
    ...overrides,
  };
}

describe('emitTicketStatusChanged', () => {
  beforeEach(() => {
    useNotificationStore.setState({ notifications: [] });
  });

  it('emits a ticket.status_changed notification to the reporter', () => {
    emitTicketStatusChanged(makeTicket(), 'asignat', BASE_NOW);
    const { notifications } = useNotificationStore.getState();
    expect(notifications).toHaveLength(1);
    expect(notifications[0].kind).toBe('ticket.status_changed');
    expect(notifications[0].userId).toBe('user-reporter');
    expect(notifications[0].asociatieId).toBe('asoc-1');
  });

  it('stores the ticket title and new status in notification data', () => {
    emitTicketStatusChanged(makeTicket({ title: 'Infiltratie' }), 'rezolvat', BASE_NOW);
    const n = useNotificationStore.getState().notifications[0];
    expect(n.data.title).toBe('Infiltratie');
    expect(n.data.status).toBe('rezolvat');
  });

  it('sets the link to /app/sesizari', () => {
    emitTicketStatusChanged(makeTicket(), 'asignat', BASE_NOW);
    expect(useNotificationStore.getState().notifications[0].link).toBe('/app/sesizari');
  });

  it('does not emit when reporter_user_id is empty', () => {
    emitTicketStatusChanged(makeTicket({ reporter_user_id: '' }), 'asignat', BASE_NOW);
    expect(useNotificationStore.getState().notifications).toHaveLength(0);
  });

  it('is offline-safe (no Supabase call needed for store emit)', () => {
    expect(() => emitTicketStatusChanged(makeTicket(), 'in_lucru', BASE_NOW)).not.toThrow();
    expect(useNotificationStore.getState().notifications).toHaveLength(1);
  });
});

describe('emitDiscussionReply', () => {
  beforeEach(() => {
    useNotificationStore.setState({ notifications: [] });
  });

  it('emits a discussion.reply notification to the thread author', () => {
    emitDiscussionReply(makeThread(), 'user-replier', 'Maria', BASE_NOW);
    const { notifications } = useNotificationStore.getState();
    expect(notifications).toHaveLength(1);
    expect(notifications[0].kind).toBe('discussion.reply');
    expect(notifications[0].userId).toBe('user-thread-author');
    expect(notifications[0].asociatieId).toBe('asoc-1');
  });

  it('stores the thread title and replier name in notification data', () => {
    emitDiscussionReply(makeThread({ title: 'Parcare' }), 'user-replier', 'Maria', BASE_NOW);
    const n = useNotificationStore.getState().notifications[0];
    expect(n.data.threadTitle).toBe('Parcare');
    expect(n.data.name).toBe('Maria');
  });

  it('sets the link to /app/discutii', () => {
    emitDiscussionReply(makeThread(), 'user-replier', 'Maria', BASE_NOW);
    expect(useNotificationStore.getState().notifications[0].link).toBe('/app/discutii');
  });

  it('skips the notification when the replier is the thread author (self-notify)', () => {
    emitDiscussionReply(makeThread(), 'user-thread-author', 'Ion', BASE_NOW);
    expect(useNotificationStore.getState().notifications).toHaveLength(0);
  });

  it('skips the notification when the thread has no prior messages', () => {
    emitDiscussionReply(makeThread({ messages: [] }), 'user-replier', 'Maria', BASE_NOW);
    expect(useNotificationStore.getState().notifications).toHaveLength(0);
  });

  it('is offline-safe (no Supabase call needed for store emit)', () => {
    expect(() => emitDiscussionReply(makeThread(), 'user-replier', 'Maria', BASE_NOW)).not.toThrow();
    expect(useNotificationStore.getState().notifications).toHaveLength(1);
  });
});
