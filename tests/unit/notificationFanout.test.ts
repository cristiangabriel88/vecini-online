import { describe, it, expect, beforeEach } from 'vitest';
import type { Ticket, DiscussionThread, AgaMeeting, Apartment } from '@/shared/types/domain';
import {
  emitTicketStatusChanged,
  emitDiscussionReply,
  emitAgaConvoked,
  emitAgaVotingOpen,
} from '@/features/notifications/notificationFanout';
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

function makeMeeting(overrides: Partial<AgaMeeting> = {}): AgaMeeting {
  return {
    id: 'aga-1',
    asociatie_id: 'asoc-1',
    title: 'AGA ordinară 2026',
    scheduled_at: '2026-07-15T18:00',
    location: 'Sala A',
    scheduled_online: false,
    required_quorum_percent: 50,
    status: 'convocata',
    total_apartments: 3,
    represented_apartments: 0,
    my_rsvp: null,
    agenda: [],
    proxies: [],
    ...overrides,
  };
}

function makeApartment(id: string, claimedUserIds: (string | null)[]): Apartment {
  return {
    id,
    asociatie_id: 'asoc-1',
    scara: 'A',
    etaj: 1,
    numar_apartament: id,
    suprafata_utila: 60,
    cota_parte_indiviza: 0.04,
    numar_persoane: claimedUserIds.length,
    persons: claimedUserIds.map((uid, i) => ({
      id: `pe-${id}-${i}`,
      name: `Persoana ${i}`,
      role: 'proprietar',
      is_primary: i === 0,
      claimed_user_id: uid,
    })),
    proprietar_principal_name: 'Test',
    is_active: true,
    notes: null,
    created_at: '',
    updated_at: '',
  };
}

describe('emitAgaConvoked', () => {
  beforeEach(() => {
    useNotificationStore.setState({ notifications: [] });
  });

  it('skips when no apartments are provided', () => {
    emitAgaConvoked(makeMeeting(), [], 'u-admin', BASE_NOW);
    expect(useNotificationStore.getState().notifications).toHaveLength(0);
  });

  it('skips when no apartment has a claimed_user_id', () => {
    const apts = [makeApartment('ap-1', [null]), makeApartment('ap-2', [null])];
    emitAgaConvoked(makeMeeting(), apts, 'u-admin', BASE_NOW);
    expect(useNotificationStore.getState().notifications).toHaveLength(0);
  });

  it('skips self-notify (selfUserId excluded from recipients)', () => {
    const apts = [makeApartment('ap-1', ['u-admin'])];
    emitAgaConvoked(makeMeeting(), apts, 'u-admin', BASE_NOW);
    expect(useNotificationStore.getState().notifications).toHaveLength(0);
  });

  it('emits one notification per unique claimed holder', () => {
    const apts = [
      makeApartment('ap-1', ['u-res1']),
      makeApartment('ap-2', ['u-res2']),
      makeApartment('ap-3', ['u-res1']),
    ];
    emitAgaConvoked(makeMeeting(), apts, 'u-admin', BASE_NOW);
    const ns = useNotificationStore.getState().notifications;
    expect(ns).toHaveLength(2);
    expect(ns.map((n) => n.userId).sort()).toEqual(['u-res1', 'u-res2']);
  });

  it('emits aga.convoked kind with correct data', () => {
    const apts = [makeApartment('ap-1', ['u-res1'])];
    const meeting = makeMeeting({ title: 'AGA ordinară 2026', scheduled_at: '2026-07-15T18:00', location: 'Sala A' });
    emitAgaConvoked(meeting, apts, 'u-admin', BASE_NOW);
    const n = useNotificationStore.getState().notifications[0];
    expect(n.kind).toBe('aga.convoked');
    expect(n.data.title).toBe('AGA ordinară 2026');
    expect(n.data.date).toBe('2026-07-15T18:00');
    expect(n.data.location).toBe('Sala A');
    expect(n.link).toBe('/app/aga');
    expect(n.priority).toBe('normal');
  });

  it('sets the correct asociatieId and userId on each notification', () => {
    const apts = [makeApartment('ap-1', ['u-res1'])];
    emitAgaConvoked(makeMeeting(), apts, 'u-admin', BASE_NOW);
    const n = useNotificationStore.getState().notifications[0];
    expect(n.userId).toBe('u-res1');
    expect(n.asociatieId).toBe('asoc-1');
  });

  it('is offline-safe', () => {
    const apts = [makeApartment('ap-1', ['u-res1'])];
    expect(() => emitAgaConvoked(makeMeeting(), apts, 'u-admin', BASE_NOW)).not.toThrow();
    expect(useNotificationStore.getState().notifications).toHaveLength(1);
  });
});

describe('emitAgaVotingOpen', () => {
  beforeEach(() => {
    useNotificationStore.setState({ notifications: [] });
  });

  it('skips when no apartments are provided', () => {
    emitAgaVotingOpen(makeMeeting({ status: 'in_desfasurare' }), [], 'u-admin', BASE_NOW);
    expect(useNotificationStore.getState().notifications).toHaveLength(0);
  });

  it('skips when no apartment has a claimed_user_id', () => {
    const apts = [makeApartment('ap-1', [null])];
    emitAgaVotingOpen(makeMeeting({ status: 'in_desfasurare' }), apts, 'u-admin', BASE_NOW);
    expect(useNotificationStore.getState().notifications).toHaveLength(0);
  });

  it('skips self-notify', () => {
    const apts = [makeApartment('ap-1', ['u-admin'])];
    emitAgaVotingOpen(makeMeeting({ status: 'in_desfasurare' }), apts, 'u-admin', BASE_NOW);
    expect(useNotificationStore.getState().notifications).toHaveLength(0);
  });

  it('emits one notification per unique claimed holder', () => {
    const apts = [makeApartment('ap-1', ['u-res1']), makeApartment('ap-2', ['u-res2'])];
    emitAgaVotingOpen(makeMeeting({ status: 'in_desfasurare' }), apts, 'u-admin', BASE_NOW);
    const ns = useNotificationStore.getState().notifications;
    expect(ns).toHaveLength(2);
  });

  it('emits aga.voting_open kind with urgent priority and correct data', () => {
    const apts = [makeApartment('ap-1', ['u-res1'])];
    const meeting = makeMeeting({ title: 'AGA ordinară 2026', status: 'in_desfasurare' });
    emitAgaVotingOpen(meeting, apts, 'u-admin', BASE_NOW);
    const n = useNotificationStore.getState().notifications[0];
    expect(n.kind).toBe('aga.voting_open');
    expect(n.data.title).toBe('AGA ordinară 2026');
    expect(n.link).toBe('/app/aga');
    expect(n.priority).toBe('urgent');
  });

  it('sets the correct asociatieId and userId on each notification', () => {
    const apts = [makeApartment('ap-1', ['u-res1'])];
    emitAgaVotingOpen(makeMeeting({ status: 'in_desfasurare' }), apts, 'u-admin', BASE_NOW);
    const n = useNotificationStore.getState().notifications[0];
    expect(n.userId).toBe('u-res1');
    expect(n.asociatieId).toBe('asoc-1');
  });

  it('is offline-safe', () => {
    const apts = [makeApartment('ap-1', ['u-res1'])];
    expect(() => emitAgaVotingOpen(makeMeeting({ status: 'in_desfasurare' }), apts, 'u-admin', BASE_NOW)).not.toThrow();
    expect(useNotificationStore.getState().notifications).toHaveLength(1);
  });
});
