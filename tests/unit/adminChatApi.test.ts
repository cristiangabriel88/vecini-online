import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAdminChatStore } from '@/features/adminchat/adminChatStore';
import {
  hydrateThreads,
  startThread,
  reply,
  markRead,
  toggleStatus,
} from '@/features/adminchat/adminChatApi';

// adminChatApi offline-path tests (T129).
// Live-path tests require a real Supabase backend; the offline path
// (isSupabaseConfigured === false) is what CI exercises here. Key contracts:
//   - hydrateThreads: no-op when not configured (store untouched)
//   - startThread: adds a thread to the store synchronously; onError is never
//     called when Supabase is not configured
//   - reply: appends a message and reopens the thread
//   - markRead: marks the other party's messages read for the given viewer
//   - toggleStatus: flips open <-> resolved

const ASOC = 'asoc-test';

function resetStore() {
  useAdminChatStore.setState({ byAsociatie: {} });
}

beforeEach(resetStore);

describe('hydrateThreads', () => {
  it('is a no-op when Supabase is not configured', async () => {
    await hydrateThreads(ASOC);
    expect(useAdminChatStore.getState().byAsociatie[ASOC]).toBeUndefined();
  });

  it('is a no-op when asociatieId is empty', async () => {
    await hydrateThreads('');
    expect(Object.keys(useAdminChatStore.getState().byAsociatie)).toHaveLength(0);
  });
});

describe('startThread', () => {
  it('adds a thread to the store synchronously', () => {
    const thread = startThread(ASOC, 'resident', {
      subject: 'Intrebare',
      body: 'Buna ziua',
      residentUserId: 'u-1',
      residentName: 'Ion Popescu',
    });
    const list = useAdminChatStore.getState().byAsociatie[ASOC] ?? [];
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(thread.id);
    expect(list[0].subject).toBe('Intrebare');
    expect(list[0].status).toBe('open');
    expect(list[0].messages).toHaveLength(1);
    expect(list[0].messages[0].sender).toBe('resident');
  });

  it('returns the newly created thread', () => {
    const thread = startThread(ASOC, 'admin', {
      subject: 'Notificare',
      body: 'Vopsit scara',
      residentUserId: 'u-2',
      residentName: 'Maria Ionescu',
      apartmentLabel: 'Ap. 3',
    });
    expect(thread.apartment_label).toBe('Ap. 3');
    expect(thread.resident_user_id).toBe('u-2');
  });

  it('does not call onError when Supabase is not configured', () => {
    const onError = vi.fn();
    startThread(
      ASOC,
      'resident',
      { subject: 'Test', body: 'Mesaj', residentUserId: 'u-3', residentName: 'Radu' },
      onError,
    );
    expect(onError).not.toHaveBeenCalled();
  });
});

describe('reply', () => {
  it('appends a message and reopens a resolved thread', () => {
    const thread = startThread(ASOC, 'resident', {
      subject: 'S',
      body: 'M1',
      residentUserId: 'u-1',
      residentName: 'Ion',
    });
    useAdminChatStore.getState().toggleStatus(ASOC, thread.id);
    expect(useAdminChatStore.getState().byAsociatie[ASOC]?.[0].status).toBe('resolved');

    reply(ASOC, thread.id, 'admin', 'Administrator', 'Raspuns admin');
    const updated = useAdminChatStore.getState().byAsociatie[ASOC]?.[0];
    expect(updated?.messages).toHaveLength(2);
    expect(updated?.messages[1].sender).toBe('admin');
    expect(updated?.messages[1].body).toBe('Raspuns admin');
    expect(updated?.status).toBe('open');
  });

  it('does not call onError when Supabase is not configured', () => {
    const thread = startThread(ASOC, 'resident', {
      subject: 'S',
      body: 'M',
      residentUserId: 'u-1',
      residentName: 'Ion',
    });
    const onError = vi.fn();
    reply(ASOC, thread.id, 'admin', 'Administrator', 'R', onError);
    expect(onError).not.toHaveBeenCalled();
  });
});

describe('markRead', () => {
  it('marks the counterpart messages as read for the given viewer', () => {
    const thread = startThread(ASOC, 'resident', {
      subject: 'S',
      body: 'M',
      residentUserId: 'u-1',
      residentName: 'Ion',
    });
    reply(ASOC, thread.id, 'admin', 'Administrator', 'Raspuns');
    const before = useAdminChatStore.getState().byAsociatie[ASOC]?.[0].messages;
    expect(before?.find((m) => m.sender === 'admin')?.read).toBe(false);

    markRead(ASOC, thread.id, 'resident');
    const after = useAdminChatStore.getState().byAsociatie[ASOC]?.[0].messages;
    expect(after?.find((m) => m.sender === 'admin')?.read).toBe(true);
    expect(after?.find((m) => m.sender === 'resident')?.read).toBe(false);
  });
});

describe('toggleStatus', () => {
  it('flips the thread from open to resolved and back', () => {
    const thread = startThread(ASOC, 'admin', {
      subject: 'T',
      body: 'B',
      residentUserId: 'u-1',
      residentName: 'Ion',
    });
    expect(thread.status).toBe('open');

    toggleStatus(ASOC, thread.id);
    expect(useAdminChatStore.getState().byAsociatie[ASOC]?.[0].status).toBe('resolved');

    toggleStatus(ASOC, thread.id);
    expect(useAdminChatStore.getState().byAsociatie[ASOC]?.[0].status).toBe('open');
  });

  it('does not call onError when Supabase is not configured', () => {
    const thread = startThread(ASOC, 'admin', {
      subject: 'T',
      body: 'B',
      residentUserId: 'u-1',
      residentName: 'Ion',
    });
    const onError = vi.fn();
    toggleStatus(ASOC, thread.id, onError);
    expect(onError).not.toHaveBeenCalled();
  });
});
