import { describe, expect, it } from 'vitest';
import type { DiscussionMessage, DiscussionThread } from '@/shared/types/domain';
import {
  applyDiscussionThreadInsert,
  applyDiscussionThreadUpdate,
  applyDiscussionThreadDelete,
  applyDiscussionMessageChange,
} from '@/app/realtimeLogic';

// Pure Realtime event-apply helpers for F02 discussions. All functions are
// deterministic; no Supabase connection is needed.

const thread = (id: string, overrides: Partial<DiscussionThread> = {}): DiscussionThread => ({
  id,
  asociatie_id: 'asoc-1',
  topic: '#general',
  title: `Thread ${id}`,
  pinned: false,
  created_at: '2026-01-01T00:00:00Z',
  messages: [],
  ...overrides,
});

const message = (id: string, threadId: string, body = 'Hello'): DiscussionMessage => ({
  id,
  thread_id: threadId,
  author_user_id: 'u-1',
  author_name: 'Ion',
  body,
  created_at: '2026-01-01T00:00:00Z',
});

describe('applyDiscussionThreadInsert', () => {
  it('prepends a new thread', () => {
    const result = applyDiscussionThreadInsert([thread('t1')], thread('t2'));
    expect(result.map((t) => t.id)).toEqual(['t2', 't1']);
  });

  it('deduplicates an optimistic-write echo by id', () => {
    const current = [thread('t1')];
    const result = applyDiscussionThreadInsert(current, thread('t1'));
    expect(result).toBe(current);
  });
});

describe('applyDiscussionThreadUpdate', () => {
  it('patches topic/title/pinned and preserves local messages', () => {
    const t = thread('t1', { messages: [message('m1', 't1')] });
    const result = applyDiscussionThreadUpdate([t], 't1', {
      topic: '#anunturi',
      title: 'Renamed',
      pinned: true,
    });
    expect(result[0].title).toBe('Renamed');
    expect(result[0].pinned).toBe(true);
    expect(result[0].messages).toHaveLength(1);
  });

  it('leaves other threads untouched', () => {
    const result = applyDiscussionThreadUpdate([thread('t1'), thread('t2')], 't1', {
      topic: '#general',
      title: 'X',
      pinned: false,
    });
    expect(result[1].title).toBe('Thread t2');
  });
});

describe('applyDiscussionThreadDelete', () => {
  it('removes the thread by id', () => {
    const result = applyDiscussionThreadDelete([thread('t1'), thread('t2')], 't1');
    expect(result.map((t) => t.id)).toEqual(['t2']);
  });
});

describe('applyDiscussionMessageChange', () => {
  it('appends a new message to its parent thread', () => {
    const result = applyDiscussionMessageChange([thread('t1')], message('m1', 't1'), null);
    expect(result[0].messages.map((m) => m.id)).toEqual(['m1']);
  });

  it('deduplicates an optimistic-write echo by replacing in place', () => {
    const t = thread('t1', { messages: [message('m1', 't1', 'old')] });
    const result = applyDiscussionMessageChange([t], message('m1', 't1', 'edited'), null);
    expect(result[0].messages).toHaveLength(1);
    expect(result[0].messages[0].body).toBe('edited');
  });

  it('removes a message when the row arrives soft-deleted', () => {
    const t = thread('t1', { messages: [message('m1', 't1'), message('m2', 't1')] });
    const result = applyDiscussionMessageChange(
      [t],
      message('m1', 't1'),
      '2026-01-02T00:00:00Z',
    );
    expect(result[0].messages.map((m) => m.id)).toEqual(['m2']);
  });

  it('is a no-op when the parent thread is not loaded', () => {
    const current = [thread('t1')];
    const result = applyDiscussionMessageChange(current, message('m1', 't-unknown'), null);
    expect(result[0].messages).toHaveLength(0);
  });
});
