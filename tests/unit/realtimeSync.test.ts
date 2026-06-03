import { describe, expect, it } from 'vitest';
import type { Announcement, Ticket, PrivateThread, PrivateMessage, Petition } from '@/shared/types/domain';
import type { AppNotification } from '@/features/notifications/notificationLogic';
import {
  applyAnnouncementChange,
  applyAnnouncementDelete,
  applyTicketChange,
  applyTicketDelete,
  applyThreadInsert,
  applyThreadStatusUpdate,
  applyThreadDelete,
  applyMessageInsert,
  applyNotificationInsert,
  applyPetitionSignatureInsert,
  applyVoteInsert,
  applyRsvpChange,
} from '@/app/realtimeLogic';

// Pure Realtime event-apply helpers (T16). All functions are deterministic; no
// Supabase connection is needed.

const ann = (id: string, title = `Ann ${id}`): Announcement => ({
  id,
  asociatie_id: 'asoc-1',
  author_user_id: 'u-1',
  title,
  body_html: '<p>body</p>',
  category: 'informativ',
  audience: { type: 'all' },
  scheduled_at: null,
  published_at: '2026-01-01T00:00:00Z',
  expires_at: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
});

const ticket = (id: string, status: Ticket['status'] = 'primit'): Ticket => ({
  id,
  asociatie_id: 'asoc-1',
  reporter_user_id: 'u-1',
  apartment_id: null,
  title: `Ticket ${id}`,
  description: 'desc',
  category: 'alta',
  severity: 'low',
  location_scara: null,
  location_etaj: null,
  location_description: null,
  status,
  assigned_to_user_id: null,
  sla_due_at: null,
  resolved_at: null,
  verified_at: null,
  resolution_notes: null,
  rating: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
});

const thread = (id: string, status: PrivateThread['status'] = 'open'): PrivateThread => ({
  id,
  asociatie_id: 'asoc-1',
  resident_user_id: 'u-1',
  resident_name: 'Ion Ionescu',
  subject: 'Subject',
  status,
  created_at: '2026-01-01T00:00:00Z',
  messages: [],
});

const message = (id: string, threadId: string): PrivateMessage => ({
  id,
  thread_id: threadId,
  sender: 'resident',
  sender_name: 'Ion',
  body: 'Hello',
  created_at: '2026-01-01T00:00:00Z',
  read: false,
});

// ---------------------------------------------------------------------------
// Announcements
// ---------------------------------------------------------------------------

describe('applyAnnouncementChange — INSERT', () => {
  it('prepends a new item to an empty list', () => {
    const result = applyAnnouncementChange([], 'INSERT', ann('a-1'));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('a-1');
  });

  it('prepends before existing items', () => {
    const result = applyAnnouncementChange([ann('a-1')], 'INSERT', ann('a-2'));
    expect(result[0].id).toBe('a-2');
    expect(result).toHaveLength(2);
  });

  it('deduplicates when id is already present (optimistic write echo)', () => {
    const existing = ann('a-1');
    const result = applyAnnouncementChange([existing], 'INSERT', existing);
    expect(result).toHaveLength(1);
  });
});

describe('applyAnnouncementChange — UPDATE', () => {
  it('replaces the matching item', () => {
    const updated = ann('a-1', 'Updated title');
    const result = applyAnnouncementChange([ann('a-1'), ann('a-2')], 'UPDATE', updated);
    expect(result[0].title).toBe('Updated title');
    expect(result).toHaveLength(2);
  });

  it('is a no-op when id is absent from the list', () => {
    const list = [ann('a-1')];
    expect(applyAnnouncementChange(list, 'UPDATE', ann('a-99'))).toEqual(list);
  });
});

describe('applyAnnouncementDelete', () => {
  it('removes the item by id', () => {
    const result = applyAnnouncementDelete([ann('a-1'), ann('a-2')], 'a-1');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('a-2');
  });

  it('is a no-op when id is absent', () => {
    const list = [ann('a-1')];
    expect(applyAnnouncementDelete(list, 'unknown')).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Tickets
// ---------------------------------------------------------------------------

describe('applyTicketChange — INSERT', () => {
  it('prepends a new ticket', () => {
    const result = applyTicketChange([ticket('t-1')], 'INSERT', ticket('t-2'));
    expect(result[0].id).toBe('t-2');
    expect(result).toHaveLength(2);
  });

  it('deduplicates on same id', () => {
    const t = ticket('t-1');
    expect(applyTicketChange([t], 'INSERT', t)).toHaveLength(1);
  });
});

describe('applyTicketChange — UPDATE', () => {
  it('replaces the matching ticket', () => {
    const updated = ticket('t-1', 'in_lucru');
    const result = applyTicketChange([ticket('t-1')], 'UPDATE', updated);
    expect(result[0].status).toBe('in_lucru');
  });

  it('is a no-op when id is absent', () => {
    const list = [ticket('t-1')];
    expect(applyTicketChange(list, 'UPDATE', ticket('t-99'))).toEqual(list);
  });
});

describe('applyTicketDelete', () => {
  it('removes the ticket by id', () => {
    expect(applyTicketDelete([ticket('t-1'), ticket('t-2')], 't-1')).toHaveLength(1);
  });

  it('is a no-op when id is absent', () => {
    const list = [ticket('t-1')];
    expect(applyTicketDelete(list, 'unknown')).toEqual(list);
  });
});

// ---------------------------------------------------------------------------
// Private threads
// ---------------------------------------------------------------------------

describe('applyThreadInsert', () => {
  it('prepends a new thread', () => {
    const result = applyThreadInsert([thread('th-1')], thread('th-2'));
    expect(result[0].id).toBe('th-2');
    expect(result).toHaveLength(2);
  });

  it('deduplicates when id is already present', () => {
    const t = thread('th-1');
    expect(applyThreadInsert([t], t)).toHaveLength(1);
  });
});

describe('applyThreadStatusUpdate', () => {
  it('patches the status of the matching thread', () => {
    const result = applyThreadStatusUpdate([thread('th-1', 'open')], 'th-1', 'resolved');
    expect(result[0].status).toBe('resolved');
  });

  it('preserves messages when updating status', () => {
    const msg = message('msg-1', 'th-1');
    const t = { ...thread('th-1'), messages: [msg] };
    expect(applyThreadStatusUpdate([t], 'th-1', 'resolved')[0].messages).toHaveLength(1);
  });

  it('does not touch other threads', () => {
    const list = [thread('th-1', 'open'), thread('th-2', 'open')];
    const result = applyThreadStatusUpdate(list, 'th-1', 'resolved');
    expect(result[1].status).toBe('open');
  });
});

describe('applyThreadDelete', () => {
  it('removes the thread by id', () => {
    expect(applyThreadDelete([thread('th-1'), thread('th-2')], 'th-1')).toHaveLength(1);
  });

  it('is a no-op when id is absent', () => {
    const list = [thread('th-1')];
    expect(applyThreadDelete(list, 'unknown')).toEqual(list);
  });
});

// ---------------------------------------------------------------------------
// Private messages
// ---------------------------------------------------------------------------

describe('applyMessageInsert', () => {
  it('appends a message to the matching thread', () => {
    const result = applyMessageInsert([thread('th-1')], message('msg-1', 'th-1'));
    expect(result[0].messages).toHaveLength(1);
    expect(result[0].messages[0].id).toBe('msg-1');
  });

  it('deduplicates on same message id (optimistic write echo)', () => {
    const msg = message('msg-1', 'th-1');
    const t = { ...thread('th-1'), messages: [msg] };
    expect(applyMessageInsert([t], msg)[0].messages).toHaveLength(1);
  });

  it('appends after existing messages (chronological order)', () => {
    const msg1 = message('msg-1', 'th-1');
    const msg2 = message('msg-2', 'th-1');
    const t = { ...thread('th-1'), messages: [msg1] };
    const result = applyMessageInsert([t], msg2);
    expect(result[0].messages[1].id).toBe('msg-2');
  });

  it('does not modify other threads', () => {
    const t1 = thread('th-1');
    const t2 = thread('th-2');
    const result = applyMessageInsert([t1, t2], message('msg-1', 'th-1'));
    expect(result[1].messages).toHaveLength(0);
  });

  it('is a no-op when thread_id is not in the list', () => {
    const threads = [thread('th-1')];
    const result = applyMessageInsert(threads, message('msg-99', 'th-99'));
    expect(result[0].messages).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

const notif = (id: string, userId = 'u-1', asociatieId: string | null = 'asoc-1'): AppNotification => ({
  id,
  userId,
  asociatieId,
  kind: 'generic',
  title: `Notif ${id}`,
  body: 'body',
  link: null,
  priority: 'normal',
  readAt: null,
  createdAt: 1700000000000,
  data: {},
});

describe('applyNotificationInsert', () => {
  it('prepends a new notification to an empty list', () => {
    const result = applyNotificationInsert([], notif('n-1'));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('n-1');
  });

  it('prepends before existing notifications', () => {
    const result = applyNotificationInsert([notif('n-1')], notif('n-2'));
    expect(result[0].id).toBe('n-2');
    expect(result).toHaveLength(2);
  });

  it('deduplicates when id is already present', () => {
    const n = notif('n-1');
    expect(applyNotificationInsert([n], n)).toHaveLength(1);
  });

  it('preserves all existing notifications when prepending', () => {
    const list = [notif('n-1'), notif('n-2')];
    const result = applyNotificationInsert(list, notif('n-3'));
    expect(result).toHaveLength(3);
    expect(result[0].id).toBe('n-3');
  });

  it('does not mutate the original list', () => {
    const list = [notif('n-1')];
    applyNotificationInsert(list, notif('n-2'));
    expect(list).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Petition signatures
// ---------------------------------------------------------------------------

const petition = (id: string, signatures = 0, threshold = 50, total = 10): Petition => ({
  id,
  asociatie_id: 'asoc-1',
  author_user_id: 'u-1',
  author_name: 'Ion',
  title: `Petition ${id}`,
  body: 'body',
  threshold_percent: threshold,
  status: 'deschisa',
  created_at: '2026-01-01T00:00:00Z',
  signatures,
  total_apartments: total,
});

describe('applyPetitionSignatureInsert', () => {
  it('increments signatures on the matching petition', () => {
    const result = applyPetitionSignatureInsert([petition('p-1', 2)], 'p-1');
    expect(result[0].signatures).toBe(3);
  });

  it('does not modify other petitions', () => {
    const list = [petition('p-1', 1), petition('p-2', 5)];
    const result = applyPetitionSignatureInsert(list, 'p-1');
    expect(result[1].signatures).toBe(5);
  });

  it('is a no-op when petitionId is absent', () => {
    const list = [petition('p-1', 1)];
    expect(applyPetitionSignatureInsert(list, 'p-99')).toEqual(list);
  });

  it('flips status to inaintata when threshold is reached', () => {
    // threshold = 50% of 10 = 5; signatures starts at 4, increment -> 5
    const result = applyPetitionSignatureInsert([petition('p-1', 4, 50, 10)], 'p-1');
    expect(result[0].status).toBe('inaintata');
  });

  it('keeps status when threshold is not yet reached', () => {
    const result = applyPetitionSignatureInsert([petition('p-1', 1, 50, 10)], 'p-1');
    expect(result[0].status).toBe('deschisa');
  });

  it('does not lower count below current when called correctly', () => {
    const result = applyPetitionSignatureInsert([petition('p-1', 0)], 'p-1');
    expect(result[0].signatures).toBe(1);
  });

  it('does not mutate the original array', () => {
    const list = [petition('p-1', 2)];
    applyPetitionSignatureInsert(list, 'p-1');
    expect(list[0].signatures).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Vote insert (poll counts)
// ---------------------------------------------------------------------------

describe('applyVoteInsert', () => {
  it('increments a single option from zero', () => {
    const result = applyVoteInsert({}, ['opt-1']);
    expect(result['opt-1']).toBe(1);
  });

  it('increments an existing count', () => {
    const result = applyVoteInsert({ 'opt-1': 3 }, ['opt-1']);
    expect(result['opt-1']).toBe(4);
  });

  it('increments multiple options in one vote', () => {
    const result = applyVoteInsert({}, ['opt-1', 'opt-2']);
    expect(result['opt-1']).toBe(1);
    expect(result['opt-2']).toBe(1);
  });

  it('does not modify counts for other options', () => {
    const result = applyVoteInsert({ 'opt-x': 7 }, ['opt-1']);
    expect(result['opt-x']).toBe(7);
  });

  it('is a no-op on an empty optionIds array', () => {
    const counts = { 'opt-1': 2 };
    expect(applyVoteInsert(counts, [])).toEqual(counts);
  });

  it('does not mutate the original counts map', () => {
    const counts = { 'opt-1': 1 };
    applyVoteInsert(counts, ['opt-1']);
    expect(counts['opt-1']).toBe(1);
  });

  it('handles duplicate option ids in the same vote by incrementing twice', () => {
    const result = applyVoteInsert({}, ['opt-1', 'opt-1']);
    expect(result['opt-1']).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// RSVP change (own-RSVP cross-device sync)
// ---------------------------------------------------------------------------

describe('applyRsvpChange', () => {
  it('sets going=true for a new RSVP', () => {
    const result = applyRsvpChange({}, 'ev-1', true);
    expect(result['ev-1']).toBe(true);
  });

  it('removes the entry when going=false', () => {
    const result = applyRsvpChange({ 'ev-1': true }, 'ev-1', false);
    expect('ev-1' in result).toBe(false);
  });

  it('does not affect other events when adding', () => {
    const result = applyRsvpChange({ 'ev-2': true }, 'ev-1', true);
    expect(result['ev-2']).toBe(true);
  });

  it('does not affect other events when removing', () => {
    const result = applyRsvpChange({ 'ev-1': true, 'ev-2': true }, 'ev-1', false);
    expect(result['ev-2']).toBe(true);
  });

  it('cancelling a non-existent RSVP returns a map without that key', () => {
    const result = applyRsvpChange({}, 'ev-1', false);
    expect('ev-1' in result).toBe(false);
  });

  it('does not mutate the original map', () => {
    const rsvps = { 'ev-1': true };
    applyRsvpChange(rsvps, 'ev-1', false);
    expect(rsvps['ev-1']).toBe(true);
  });
});
