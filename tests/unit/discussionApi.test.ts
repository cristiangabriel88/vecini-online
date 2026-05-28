import { beforeEach, describe, expect, it } from 'vitest';
import type { DiscussionThread } from '@/shared/types/domain';
import { useDiscussionStore } from '@/features/discussions/discussionStore';
import {
  addThread,
  deleteMessage,
  hydrateThreads,
  postMessage,
  togglePin,
} from '@/features/discussions/discussionApi';

// discussionApi offline-path tests (T57).
// Key contracts:
//   - hydrateThreads: no-op when not configured
//   - addThread: prepends a new thread to the store
//   - postMessage: appends a message to the correct thread
//   - togglePin: flips the pinned flag in the store
//   - deleteMessage: removes the message from the thread in the store
// replaceForAsociatie is also exercised directly.

const DEMO_ASOC = 'asoc-disc';
const AUTHOR = { id: 'u-res', name: 'Ana Ionescu' };

const SEED_THREAD: DiscussionThread = {
  id: 'dt-1',
  asociatie_id: DEMO_ASOC,
  topic: '#general',
  title: 'Hello world',
  pinned: false,
  created_at: '2026-01-01T10:00:00.000Z',
  messages: [
    {
      id: 'dm-1',
      thread_id: 'dt-1',
      author_user_id: 'u-res',
      author_name: 'Ana Ionescu',
      body: 'First message',
      created_at: '2026-01-01T10:01:00.000Z',
    },
  ],
};

beforeEach(() => {
  useDiscussionStore.setState({
    byAsociatie: { [DEMO_ASOC]: [{ ...SEED_THREAD, messages: [...SEED_THREAD.messages] }] },
  });
});

describe('useDiscussionStore — replaceForAsociatie', () => {
  it('replaces the thread list for one asociație', () => {
    useDiscussionStore.getState().replaceForAsociatie(DEMO_ASOC, []);
    expect(useDiscussionStore.getState().byAsociatie[DEMO_ASOC]).toHaveLength(0);
  });

  it('does not touch other asociatii', () => {
    useDiscussionStore.getState().replaceForAsociatie('other', []);
    expect(useDiscussionStore.getState().byAsociatie[DEMO_ASOC]).toHaveLength(1);
  });
});

describe('hydrateThreads', () => {
  it('is a no-op when Supabase is not configured (offline/CI)', async () => {
    const before = useDiscussionStore.getState().byAsociatie[DEMO_ASOC];
    await hydrateThreads(DEMO_ASOC);
    expect(useDiscussionStore.getState().byAsociatie[DEMO_ASOC]).toBe(before);
  });

  it('is a no-op when asociatieId is empty', async () => {
    const before = useDiscussionStore.getState().byAsociatie[DEMO_ASOC];
    await hydrateThreads('');
    expect(useDiscussionStore.getState().byAsociatie[DEMO_ASOC]).toBe(before);
  });
});

describe('addThread', () => {
  it('prepends a new thread to the store', () => {
    addThread(DEMO_ASOC, { title: 'New thread', topic: '#info' });
    const threads = useDiscussionStore.getState().byAsociatie[DEMO_ASOC];
    expect(threads).toHaveLength(2);
    expect(threads[0].title).toBe('New thread');
    expect(threads[0].topic).toBe('#info');
    expect(threads[0].asociatie_id).toBe(DEMO_ASOC);
    expect(threads[0].messages).toHaveLength(0);
  });

  it('new thread starts with pinned=false', () => {
    addThread(DEMO_ASOC, { title: 'Unpinned', topic: '' });
    expect(useDiscussionStore.getState().byAsociatie[DEMO_ASOC][0].pinned).toBe(false);
  });

  it('multiple addThread calls all land in the store', () => {
    addThread(DEMO_ASOC, { title: 'A', topic: '' });
    addThread(DEMO_ASOC, { title: 'B', topic: '' });
    const threads = useDiscussionStore.getState().byAsociatie[DEMO_ASOC];
    expect(threads).toHaveLength(3);
  });
});

describe('postMessage', () => {
  it('appends a message to the correct thread', () => {
    postMessage(DEMO_ASOC, 'dt-1', 'Hello back', AUTHOR);
    const thread = useDiscussionStore
      .getState()
      .byAsociatie[DEMO_ASOC].find((t) => t.id === 'dt-1');
    expect(thread?.messages).toHaveLength(2);
    expect(thread?.messages[1].body).toBe('Hello back');
    expect(thread?.messages[1].author_user_id).toBe('u-res');
    expect(thread?.messages[1].author_name).toBe('Ana Ionescu');
  });

  it('trims whitespace from the message body', () => {
    postMessage(DEMO_ASOC, 'dt-1', '   spaces   ', AUTHOR);
    const thread = useDiscussionStore
      .getState()
      .byAsociatie[DEMO_ASOC].find((t) => t.id === 'dt-1');
    expect(thread?.messages[1].body).toBe('spaces');
  });

  it('is a no-op for an unknown thread', () => {
    postMessage(DEMO_ASOC, 'dt-unknown', 'Orphan', AUTHOR);
    const threads = useDiscussionStore.getState().byAsociatie[DEMO_ASOC];
    expect(threads[0].messages).toHaveLength(1);
  });
});

describe('togglePin', () => {
  it('sets pinned=true on an unpinned thread', () => {
    togglePin(DEMO_ASOC, 'dt-1');
    const thread = useDiscussionStore
      .getState()
      .byAsociatie[DEMO_ASOC].find((t) => t.id === 'dt-1');
    expect(thread?.pinned).toBe(true);
  });

  it('toggles back to false', () => {
    togglePin(DEMO_ASOC, 'dt-1');
    togglePin(DEMO_ASOC, 'dt-1');
    const thread = useDiscussionStore
      .getState()
      .byAsociatie[DEMO_ASOC].find((t) => t.id === 'dt-1');
    expect(thread?.pinned).toBe(false);
  });
});

describe('deleteMessage', () => {
  it('removes the message from the thread', () => {
    deleteMessage(DEMO_ASOC, 'dt-1', 'dm-1');
    const thread = useDiscussionStore
      .getState()
      .byAsociatie[DEMO_ASOC].find((t) => t.id === 'dt-1');
    expect(thread?.messages).toHaveLength(0);
  });

  it('is a no-op for an unknown message id', () => {
    deleteMessage(DEMO_ASOC, 'dt-1', 'dm-unknown');
    const thread = useDiscussionStore
      .getState()
      .byAsociatie[DEMO_ASOC].find((t) => t.id === 'dt-1');
    expect(thread?.messages).toHaveLength(1);
  });
});
