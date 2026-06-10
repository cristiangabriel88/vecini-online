// T302: Rollback-path tests for comunicare write operations.
// Verifies that when a backend delete/edit fails, the store is restored to
// its pre-operation snapshot AND the supplied onError callback is invoked.
// All three surfaces are covered: announcements, discussions, adminChat.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Announcement, DiscussionThread, PrivateThread } from '@/shared/types/domain';
import { useAnnouncementsStore } from '@/features/announcements/announcementsStore';
import { useDiscussionStore } from '@/features/discussions/discussionStore';
import { useAdminChatStore } from '@/features/adminchat/adminChatStore';
import { deleteAnnouncements } from '@/features/announcements/announcementsApi';
import { deleteThread, updateMessage, togglePin, deleteMessage } from '@/features/discussions/discussionApi';
import { deleteThreads } from '@/features/adminchat/adminChatApi';

// Mock supabase to simulate live mode with backend errors.
vi.mock('@/shared/lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    from: vi.fn(),
  },
}));

// Build a chainable query builder that resolves to an error result.
function makeErrorBuilder(message = 'network error') {
  const err = { message };
  const qb: Record<string, unknown> = {};
  const terminal = () => Promise.resolve({ data: null, error: err });
  ['select', 'eq', 'in', 'update', 'delete', 'insert'].forEach((m) => {
    qb[m] = () => qb;
  });
  qb['then'] = (fn: (v: unknown) => void) => terminal().then(fn);
  return qb;
}

async function flushMicrotasks() {
  await new Promise((r) => setTimeout(r, 0));
}

// ---- Announcements -----------------------------------------------------------

const ASOC = 'asoc-rollback-test';

const SEED_ANN: Announcement = {
  id: 'ann-1',
  asociatie_id: ASOC,
  author_user_id: 'u-admin',
  title: 'Anunt test',
  body_html: '<p>test</p>',
  category: 'informativ',
  audience: { type: 'all' },
  scheduled_at: null,
  published_at: '2026-01-01T10:00:00.000Z',
  expires_at: null,
  created_at: '2026-01-01T10:00:00.000Z',
  updated_at: '2026-01-01T10:00:00.000Z',
};

describe('deleteAnnouncements rollback', () => {
  beforeEach(async () => {
    const { supabase } = await import('@/shared/lib/supabase');
    vi.mocked(supabase.from).mockReturnValue(makeErrorBuilder() as unknown as ReturnType<typeof supabase.from>);
    useAnnouncementsStore.setState({ byAsociatie: { [ASOC]: [{ ...SEED_ANN }] }, reads: {} });
  });

  it('calls onError when the backend delete fails', async () => {
    const onError = vi.fn();
    deleteAnnouncements(ASOC, ['ann-1'], onError);
    await flushMicrotasks();
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('restores the store after a backend delete failure', async () => {
    const onError = vi.fn();
    deleteAnnouncements(ASOC, ['ann-1'], onError);
    // Store is optimistically empty immediately after the call.
    expect(useAnnouncementsStore.getState().byAsociatie[ASOC]).toHaveLength(0);
    await flushMicrotasks();
    // After error: store is restored.
    expect(useAnnouncementsStore.getState().byAsociatie[ASOC]).toHaveLength(1);
    expect(useAnnouncementsStore.getState().byAsociatie[ASOC][0].id).toBe('ann-1');
  });

  it('does not call onError on success (no callback scenario)', async () => {
    const { supabase } = await import('@/shared/lib/supabase');
    const successQb: Record<string, unknown> = {};
    ['select', 'eq', 'in', 'update', 'delete', 'insert'].forEach((m) => {
      successQb[m] = () => successQb;
    });
    successQb['then'] = (fn: (v: unknown) => void) =>
      Promise.resolve({ data: [], error: null }).then(fn);
    vi.mocked(supabase.from).mockReturnValue(successQb as unknown as ReturnType<typeof supabase.from>);

    const onError = vi.fn();
    deleteAnnouncements(ASOC, ['ann-1'], onError);
    await flushMicrotasks();
    expect(onError).not.toHaveBeenCalled();
  });
});

// ---- Discussions -------------------------------------------------------------

const SEED_THREAD: DiscussionThread = {
  id: 'dt-1',
  asociatie_id: ASOC,
  topic: '#general',
  title: 'Subiect test',
  pinned: false,
  created_at: '2026-01-01T10:00:00.000Z',
  messages: [
    {
      id: 'dm-1',
      thread_id: 'dt-1',
      author_user_id: 'u-res',
      author_name: 'Ana',
      body: 'Mesaj test',
      created_at: '2026-01-01T10:01:00.000Z',
    },
  ],
};

describe('deleteThread rollback', () => {
  beforeEach(async () => {
    const { supabase } = await import('@/shared/lib/supabase');
    vi.mocked(supabase.from).mockReturnValue(makeErrorBuilder() as unknown as ReturnType<typeof supabase.from>);
    useDiscussionStore.setState({
      byAsociatie: { [ASOC]: [{ ...SEED_THREAD, messages: [...SEED_THREAD.messages] }] },
    });
  });

  it('calls onError when backend delete fails', async () => {
    const onError = vi.fn();
    deleteThread(ASOC, 'dt-1', onError);
    await flushMicrotasks();
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('restores the thread after a backend delete failure', async () => {
    const onError = vi.fn();
    deleteThread(ASOC, 'dt-1', onError);
    expect(useDiscussionStore.getState().byAsociatie[ASOC]).toHaveLength(0);
    await flushMicrotasks();
    expect(useDiscussionStore.getState().byAsociatie[ASOC]).toHaveLength(1);
    expect(useDiscussionStore.getState().byAsociatie[ASOC][0].id).toBe('dt-1');
  });
});

describe('updateMessage rollback', () => {
  beforeEach(async () => {
    const { supabase } = await import('@/shared/lib/supabase');
    vi.mocked(supabase.from).mockReturnValue(makeErrorBuilder() as unknown as ReturnType<typeof supabase.from>);
    useDiscussionStore.setState({
      byAsociatie: { [ASOC]: [{ ...SEED_THREAD, messages: [...SEED_THREAD.messages] }] },
    });
  });

  it('calls onError when backend update fails', async () => {
    const onError = vi.fn();
    updateMessage(ASOC, 'dt-1', 'dm-1', 'Mesaj modificat', onError);
    await flushMicrotasks();
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('restores the original message body after a backend update failure', async () => {
    const onError = vi.fn();
    updateMessage(ASOC, 'dt-1', 'dm-1', 'Mesaj modificat', onError);
    await flushMicrotasks();
    const msg = useDiscussionStore.getState().byAsociatie[ASOC][0].messages[0];
    expect(msg.body).toBe('Mesaj test');
  });
});

describe('togglePin rollback', () => {
  beforeEach(async () => {
    const { supabase } = await import('@/shared/lib/supabase');
    vi.mocked(supabase.from).mockReturnValue(makeErrorBuilder() as unknown as ReturnType<typeof supabase.from>);
    useDiscussionStore.setState({
      byAsociatie: { [ASOC]: [{ ...SEED_THREAD, messages: [...SEED_THREAD.messages] }] },
    });
  });

  it('calls onError when backend toggle fails', async () => {
    const onError = vi.fn();
    togglePin(ASOC, 'dt-1', onError);
    await flushMicrotasks();
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('reverts the pinned flag after a backend toggle failure', async () => {
    const onError = vi.fn();
    expect(useDiscussionStore.getState().byAsociatie[ASOC][0].pinned).toBe(false);
    togglePin(ASOC, 'dt-1', onError);
    // Optimistically toggled to true.
    expect(useDiscussionStore.getState().byAsociatie[ASOC][0].pinned).toBe(true);
    await flushMicrotasks();
    // Reverted to false after error.
    expect(useDiscussionStore.getState().byAsociatie[ASOC][0].pinned).toBe(false);
  });
});

describe('deleteMessage rollback', () => {
  beforeEach(async () => {
    const { supabase } = await import('@/shared/lib/supabase');
    vi.mocked(supabase.from).mockReturnValue(makeErrorBuilder() as unknown as ReturnType<typeof supabase.from>);
    useDiscussionStore.setState({
      byAsociatie: { [ASOC]: [{ ...SEED_THREAD, messages: [...SEED_THREAD.messages] }] },
    });
  });

  it('calls onError when backend soft-delete fails', async () => {
    const onError = vi.fn();
    deleteMessage(ASOC, 'dt-1', 'dm-1', onError);
    await flushMicrotasks();
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('restores the message after a backend soft-delete failure', async () => {
    const onError = vi.fn();
    deleteMessage(ASOC, 'dt-1', 'dm-1', onError);
    await flushMicrotasks();
    expect(useDiscussionStore.getState().byAsociatie[ASOC][0].messages).toHaveLength(1);
  });
});

// ---- AdminChat ---------------------------------------------------------------

const SEED_CHAT: PrivateThread = {
  id: 'pt-1',
  asociatie_id: ASOC,
  resident_user_id: 'u-res-1',
  resident_name: 'Popescu Ion',
  subject: 'Problema',
  status: 'open',
  created_at: '2026-01-01T10:00:00.000Z',
  messages: [],
};

describe('adminChat deleteThreads rollback', () => {
  beforeEach(async () => {
    const { supabase } = await import('@/shared/lib/supabase');
    vi.mocked(supabase.from).mockReturnValue(makeErrorBuilder() as unknown as ReturnType<typeof supabase.from>);
    useAdminChatStore.setState({ byAsociatie: { [ASOC]: [{ ...SEED_CHAT }] } });
  });

  it('calls onError when backend delete fails', async () => {
    const onError = vi.fn();
    deleteThreads(ASOC, ['pt-1'], onError);
    await flushMicrotasks();
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('restores the thread after a backend delete failure', async () => {
    const onError = vi.fn();
    deleteThreads(ASOC, ['pt-1'], onError);
    expect(useAdminChatStore.getState().forAsociatie(ASOC)).toHaveLength(0);
    await flushMicrotasks();
    expect(useAdminChatStore.getState().forAsociatie(ASOC)).toHaveLength(1);
    expect(useAdminChatStore.getState().forAsociatie(ASOC)[0].id).toBe('pt-1');
  });
});
