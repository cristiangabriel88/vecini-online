import { describe, expect, it } from 'vitest';
import type { Announcement, Ticket, PrivateThread, PrivateMessage } from '@/shared/types/domain';
import {
  applyAnnouncementChange,
  applyAnnouncementDelete,
  applyTicketChange,
  applyTicketDelete,
  applyThreadInsert,
  applyThreadStatusUpdate,
  applyThreadDelete,
  applyMessageInsert,
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
