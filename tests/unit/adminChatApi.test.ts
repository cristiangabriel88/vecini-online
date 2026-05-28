import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrivateThread } from '@/shared/types/domain';
import { useAdminChatStore } from '@/features/adminchat/adminChatStore';
import { hydrateThreads, startThread, reply, markRead, toggleStatus } from '@/features/adminchat/adminChatApi';

// adminChatApi offline-path tests (T129).
// Live-path tests require a real Supabase backend; the offline path
// (isSupabaseConfigured === false) is what CI exercises here. Key contracts:
//   - hydrateThreads: no-op when not configured (store untouched)
//   - startThread: creates a thread in the store + calls onError on failure
//   - reply: appends a message and reopens the thread
//   - markRead: marks the counterpart's messages as read
//   - toggleStatus: flips the thread status
// The resident-visibility filter (resident_user_id === viewer) lives in the
// page's useMemo; the store itself holds all threads for the asociatie and
// the RLS policy enforces isolation at the DB level.

const ASOC = 'asoc-test';
const OTHER_ASOC = 'asoc-other';

const SEED: PrivateThread[] = [
  {
    id: 'pt-1',
    asociatie_id: ASOC,
    resident_user_id: 'u-res-1',
    resident_name: 'Popescu Andrei',
    subject: 'Problema cu apa',
    status: 'open',
    created_at: '2026-01-01T10:00:00.000Z',
    messages: [
      {
        id: 'pm-1',
        thread_id: 'pt-1',
        sender: 'resident',
        sender_name: 'Popescu Andrei',
        body: 'Am o problema.',
        read: false,
        created_at: '2026-01-01T10:00:00.000Z',
      },
    ],
  },
  {
    id: 'pt-2',
    asociatie_id: ASOC,
    resident_user_id: 'u-res-2',
    resident_name: 'Ionescu Maria',
    subject: 'Alta problema',
    status: 'resolved',
    created_at: '2026-01-02T10:00:00.000Z',
    messages: [
      {
        id: 'pm-2',
        thread_id: 'pt-2',
        sender: 'admin',
        sender_name: 'Administrator',
        body: 'Rezolvat.',
        read: false,
        created_at: '2026-01-02T10:00:00.000Z',
      },
    ],
  },
];

beforeEach(() => {
  useAdminChatStore.setState({
    byAsociatie: { [ASOC]: [...SEED.map((t) => ({ ...t, messages: [...t.messages] }))] },
  });
});

describe('hydrateThreads', () => {
  it('is a no-op when Supabase is not configured (offline/CI)', async () => {
    const before = useAdminChatStore.getState().forAsociatie(ASOC);
    await hydrateThreads(ASOC);
    expect(useAdminChatStore.getState().forAsociatie(ASOC)).toBe(before);
  });

  it('is a no-op when asociatieId is empty', async () => {
    const before = useAdminChatStore.getState().forAsociatie(ASOC);
    await hydrateThreads('');
    expect(useAdminChatStore.getState().forAsociatie(ASOC)).toBe(before);
  });
});

describe('startThread', () => {
  it('creates a thread in the store for the given asociatie', () => {
    const before = useAdminChatStore.getState().forAsociatie(ASOC).length;
    startThread(ASOC, 'resident', {
      subject: 'Nou subiect',
      body: 'Mesaj initial.',
      residentUserId: 'u-res-3',
      residentName: 'Gheorghe Dan',
    });
    expect(useAdminChatStore.getState().forAsociatie(ASOC)).toHaveLength(before + 1);
  });

  it('returns the created thread with the correct metadata', () => {
    const th = startThread(ASOC, 'resident', {
      subject: 'Subiect',
      body: 'Continut.',
      residentUserId: 'u-res-3',
      residentName: 'Gheorghe Dan',
    });
    expect(th.asociatie_id).toBe(ASOC);
    expect(th.status).toBe('open');
    expect(th.resident_user_id).toBe('u-res-3');
    expect(th.messages).toHaveLength(1);
    expect(th.messages[0].sender).toBe('resident');
    expect(th.messages[0].body).toBe('Continut.');
  });

  it('does not affect threads in a different asociatie', () => {
    useAdminChatStore.setState((s) => ({
      byAsociatie: { ...s.byAsociatie, [OTHER_ASOC]: [] },
    }));
    startThread(ASOC, 'resident', {
      subject: 'X',
      body: 'Y',
      residentUserId: 'u-r',
      residentName: 'R',
    });
    expect(useAdminChatStore.getState().forAsociatie(OTHER_ASOC)).toHaveLength(0);
  });

  it('does not call onError in the offline path (no Supabase configured)', () => {
    const onError = vi.fn();
    startThread(ASOC, 'resident', {
      subject: 'X',
      body: 'Y',
      residentUserId: 'u-r',
      residentName: 'R',
    }, onError);
    expect(onError).not.toHaveBeenCalled();
  });
});

describe('reply', () => {
  it('appends a message to the thread', () => {
    const before = useAdminChatStore.getState().forAsociatie(ASOC).find((t) => t.id === 'pt-1')!.messages.length;
    reply(ASOC, 'pt-1', 'admin', 'Administrator', 'Raspuns la problema.');
    const after = useAdminChatStore.getState().forAsociatie(ASOC).find((t) => t.id === 'pt-1')!.messages;
    expect(after).toHaveLength(before + 1);
    expect(after[after.length - 1].body).toBe('Raspuns la problema.');
    expect(after[after.length - 1].sender).toBe('admin');
  });

  it('reopens a resolved thread on reply', () => {
    reply(ASOC, 'pt-2', 'resident', 'Ionescu Maria', 'Problema a revenit.');
    const th = useAdminChatStore.getState().forAsociatie(ASOC).find((t) => t.id === 'pt-2')!;
    expect(th.status).toBe('open');
  });

  it('does not call onError in the offline path', () => {
    const onError = vi.fn();
    reply(ASOC, 'pt-1', 'admin', 'Administrator', 'Buna ziua.', onError);
    expect(onError).not.toHaveBeenCalled();
  });
});

describe('markRead', () => {
  it('marks the counterpart messages as read from the admin viewer', () => {
    // Admin reads pt-1 -> resident messages become read
    markRead(ASOC, 'pt-1', 'admin');
    const th = useAdminChatStore.getState().forAsociatie(ASOC).find((t) => t.id === 'pt-1')!;
    const residentMessages = th.messages.filter((m) => m.sender === 'resident');
    expect(residentMessages.every((m) => m.read)).toBe(true);
  });

  it('marks the counterpart messages as read from the resident viewer', () => {
    // Resident reads pt-2 -> admin messages become read
    markRead(ASOC, 'pt-2', 'resident');
    const th = useAdminChatStore.getState().forAsociatie(ASOC).find((t) => t.id === 'pt-2')!;
    const adminMessages = th.messages.filter((m) => m.sender === 'admin');
    expect(adminMessages.every((m) => m.read)).toBe(true);
  });

  it('does not mark messages from the viewer themselves as read', () => {
    // Admin reads pt-1 -> admin's own messages must remain unchanged
    const before = useAdminChatStore.getState().forAsociatie(ASOC)
      .find((t) => t.id === 'pt-1')!.messages
      .filter((m) => m.sender === 'admin')
      .map((m) => m.read);
    markRead(ASOC, 'pt-1', 'admin');
    const after = useAdminChatStore.getState().forAsociatie(ASOC)
      .find((t) => t.id === 'pt-1')!.messages
      .filter((m) => m.sender === 'admin')
      .map((m) => m.read);
    expect(after).toEqual(before);
  });
});

describe('toggleStatus', () => {
  it('resolves an open thread', () => {
    toggleStatus(ASOC, 'pt-1');
    const th = useAdminChatStore.getState().forAsociatie(ASOC).find((t) => t.id === 'pt-1')!;
    expect(th.status).toBe('resolved');
  });

  it('reopens a resolved thread', () => {
    toggleStatus(ASOC, 'pt-2');
    const th = useAdminChatStore.getState().forAsociatie(ASOC).find((t) => t.id === 'pt-2')!;
    expect(th.status).toBe('open');
  });

  it('does not call onError in the offline path', () => {
    const onError = vi.fn();
    toggleStatus(ASOC, 'pt-1', onError);
    expect(onError).not.toHaveBeenCalled();
  });
});

describe('resident thread isolation (client-side filter)', () => {
  it('the store holds threads for all residents; pages filter by resident_user_id', () => {
    // The store is not responsible for filtering — that is the page's useMemo.
    // This test documents the invariant: all asociatie threads are in the store;
    // individual residents see only their own via the client filter + RLS.
    const all = useAdminChatStore.getState().forAsociatie(ASOC);
    expect(all.map((t) => t.resident_user_id)).toContain('u-res-1');
    expect(all.map((t) => t.resident_user_id)).toContain('u-res-2');

    // A resident with user id u-res-1 should only see their own thread.
    const visibleToRes1 = all.filter((t) => t.resident_user_id === 'u-res-1');
    expect(visibleToRes1).toHaveLength(1);
    expect(visibleToRes1[0].id).toBe('pt-1');

    // u-res-1 must NOT see pt-2 (u-res-2's thread).
    expect(visibleToRes1.find((t) => t.id === 'pt-2')).toBeUndefined();
  });
});
