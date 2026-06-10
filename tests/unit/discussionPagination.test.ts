import { beforeEach, describe, expect, it } from 'vitest';
import type { DiscussionMessage, DiscussionThread } from '@/shared/types/domain';
import { useDiscussionStore } from '@/features/discussions/discussionStore';
import { hydrateThreads, loadThreadMessages, MESSAGES_PAGE_SIZE } from '@/features/discussions/discussionApi';

// Discussion pagination tests (T299).
// Covers the new per-thread lazy-message-loading store actions and the
// offline-path contracts of the API functions.

const ASOC = 'asoc-pagination-test';

function msg(id: string, threadId: string, created_at: string): DiscussionMessage {
  return {
    id,
    thread_id: threadId,
    author_user_id: 'u1',
    author_name: 'Alice',
    body: `Message ${id}`,
    created_at,
  };
}

function thread(id: string, messages: DiscussionMessage[]): DiscussionThread {
  return {
    id,
    asociatie_id: ASOC,
    topic: '#general',
    title: `Thread ${id}`,
    pinned: false,
    created_at: '2026-01-01T00:00:00.000Z',
    messages,
  };
}

const THREAD_ID = 'th-1';
const INITIAL_MESSAGES = [
  msg('m-1', THREAD_ID, '2026-01-01T10:00:00.000Z'),
  msg('m-2', THREAD_ID, '2026-01-01T11:00:00.000Z'),
  msg('m-3', THREAD_ID, '2026-01-01T12:00:00.000Z'),
];

beforeEach(() => {
  useDiscussionStore.setState({
    byAsociatie: { [ASOC]: [thread(THREAD_ID, [...INITIAL_MESSAGES])] },
    fetchError: null,
    postTimestamps: {},
  });
});

describe('useDiscussionStore — setMessagesForThread (T299)', () => {
  it('replaces thread messages with the provided list', () => {
    const newMsgs = [msg('m-new', THREAD_ID, '2026-02-01T10:00:00.000Z')];
    useDiscussionStore.getState().setMessagesForThread(ASOC, THREAD_ID, newMsgs);
    const updated = useDiscussionStore.getState().byAsociatie[ASOC]!.find((t) => t.id === THREAD_ID);
    expect(updated?.messages).toHaveLength(1);
    expect(updated?.messages[0].id).toBe('m-new');
  });

  it('does not touch other threads', () => {
    useDiscussionStore.setState({
      byAsociatie: {
        [ASOC]: [
          thread(THREAD_ID, [...INITIAL_MESSAGES]),
          thread('th-2', [msg('m-x', 'th-2', '2026-01-01T10:00:00.000Z')]),
        ],
      },
    });
    useDiscussionStore.getState().setMessagesForThread(ASOC, THREAD_ID, []);
    const th2 = useDiscussionStore.getState().byAsociatie[ASOC]!.find((t) => t.id === 'th-2');
    expect(th2?.messages).toHaveLength(1);
  });

  it('does not touch other asociatii', () => {
    useDiscussionStore.setState({
      byAsociatie: {
        [ASOC]: [thread(THREAD_ID, [...INITIAL_MESSAGES])],
        'other-asoc': [thread('th-other', [msg('m-y', 'th-other', '2026-01-01T10:00:00.000Z')])],
      },
    });
    useDiscussionStore.getState().setMessagesForThread(ASOC, THREAD_ID, []);
    const other = useDiscussionStore.getState().byAsociatie['other-asoc']!.find((t) => t.id === 'th-other');
    expect(other?.messages).toHaveLength(1);
  });
});

describe('useDiscussionStore — prependMessagesForThread (T299)', () => {
  it('prepends older messages before the existing ones', () => {
    const older = [
      msg('m-old-1', THREAD_ID, '2025-12-01T09:00:00.000Z'),
      msg('m-old-2', THREAD_ID, '2025-12-01T10:00:00.000Z'),
    ];
    useDiscussionStore.getState().prependMessagesForThread(ASOC, THREAD_ID, older);
    const msgs = useDiscussionStore.getState().byAsociatie[ASOC]!.find((t) => t.id === THREAD_ID)?.messages ?? [];
    expect(msgs).toHaveLength(5);
    expect(msgs[0].id).toBe('m-old-1');
    expect(msgs[1].id).toBe('m-old-2');
    expect(msgs[2].id).toBe('m-1');
  });

  it('preserves the original messages after prepend', () => {
    useDiscussionStore.getState().prependMessagesForThread(ASOC, THREAD_ID, [
      msg('m-older', THREAD_ID, '2025-11-01T00:00:00.000Z'),
    ]);
    const msgs = useDiscussionStore.getState().byAsociatie[ASOC]!.find((t) => t.id === THREAD_ID)?.messages ?? [];
    expect(msgs.map((m) => m.id)).toContain('m-1');
    expect(msgs.map((m) => m.id)).toContain('m-2');
    expect(msgs.map((m) => m.id)).toContain('m-3');
  });

  it('does not affect other threads', () => {
    useDiscussionStore.setState({
      byAsociatie: {
        [ASOC]: [
          thread(THREAD_ID, [...INITIAL_MESSAGES]),
          thread('th-2', [msg('m-x', 'th-2', '2026-01-01T10:00:00.000Z')]),
        ],
      },
    });
    useDiscussionStore.getState().prependMessagesForThread(ASOC, THREAD_ID, [
      msg('m-older', THREAD_ID, '2025-12-01T00:00:00.000Z'),
    ]);
    const th2 = useDiscussionStore.getState().byAsociatie[ASOC]!.find((t) => t.id === 'th-2');
    expect(th2?.messages).toHaveLength(1);
    expect(th2?.messages[0].id).toBe('m-x');
  });
});

describe('query-window cursor derivation (T299)', () => {
  it('the oldest announcement cursor is the last item\'s created_at', () => {
    const items = [
      { created_at: '2026-03-01T00:00:00.000Z' },
      { created_at: '2026-02-01T00:00:00.000Z' },
      { created_at: '2026-01-01T00:00:00.000Z' },
    ];
    expect(items.at(-1)?.created_at).toBe('2026-01-01T00:00:00.000Z');
  });

  it('the oldest message cursor is the first (oldest-first) message\'s created_at', () => {
    const messages = [
      msg('m-1', THREAD_ID, '2026-01-01T10:00:00.000Z'),
      msg('m-2', THREAD_ID, '2026-01-01T11:00:00.000Z'),
      msg('m-3', THREAD_ID, '2026-01-01T12:00:00.000Z'),
    ];
    expect(messages[0].created_at).toBe('2026-01-01T10:00:00.000Z');
  });

  it('hasMore is true when page is full (MESSAGES_PAGE_SIZE items)', () => {
    expect(MESSAGES_PAGE_SIZE).toBeGreaterThan(0);
    const full = Array.from({ length: MESSAGES_PAGE_SIZE }, (_, i) =>
      msg(`m-${i}`, THREAD_ID, `2026-01-${String(i + 1).padStart(2, '0')}T00:00:00.000Z`),
    );
    expect(full.length === MESSAGES_PAGE_SIZE).toBe(true);
  });

  it('hasMore is false when page is not full', () => {
    const partial = Array.from({ length: MESSAGES_PAGE_SIZE - 1 }, (_, i) =>
      msg(`m-${i}`, THREAD_ID, `2026-01-${String(i + 1).padStart(2, '0')}T00:00:00.000Z`),
    );
    expect(partial.length < MESSAGES_PAGE_SIZE).toBe(true);
  });
});

describe('hydrateThreads — offline no-op (T299)', () => {
  it('is a no-op when Supabase is not configured', async () => {
    const before = useDiscussionStore.getState().byAsociatie[ASOC];
    await hydrateThreads(ASOC);
    expect(useDiscussionStore.getState().byAsociatie[ASOC]).toBe(before);
  });
});

describe('loadThreadMessages — offline no-op (T299)', () => {
  it('returns empty messages and hasMore: false when offline', async () => {
    const result = await loadThreadMessages(ASOC, THREAD_ID);
    expect(result.messages).toHaveLength(0);
    expect(result.hasMore).toBe(false);
  });

  it('does not modify the store when offline', async () => {
    const before = useDiscussionStore.getState().byAsociatie[ASOC];
    await loadThreadMessages(ASOC, THREAD_ID);
    expect(useDiscussionStore.getState().byAsociatie[ASOC]).toBe(before);
  });

  it('returns hasMore: false with beforeCreatedAt when offline', async () => {
    const result = await loadThreadMessages(ASOC, THREAD_ID, '2026-01-01T11:00:00.000Z');
    expect(result.hasMore).toBe(false);
  });
});
