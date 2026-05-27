import { beforeEach, describe, expect, it } from 'vitest';
import type { AnonymousMessage } from '@/shared/types/domain';
import { useAnonymousStore } from '@/features/anonymous/anonymousStore';
import {
  hydrateAnonymousMessages,
  submitAnonymousMessage,
  setAnonymousMessageStatus,
} from '@/features/anonymous/anonymousApi';

// anonymousApi offline-path tests (T138).
// Live-path tests require a real Supabase backend; the offline path (no env
// vars, isSupabaseConfigured === false) is what CI exercises here. The key
// contracts are:
//   - hydrateAnonymousMessages: no-op when not configured (store untouched)
//   - submitAnonymousMessage: prepends a well-formed message to the store
//   - setAnonymousMessageStatus: sets the exact requested status in the store
// The store's new replaceAll / setStatus actions are also exercised directly.

const SEED: AnonymousMessage[] = [
  {
    id: 'an-1',
    asociatie_id: 'asoc-x',
    sender_user_id: 'u-res',
    body: 'First message',
    status: 'nou',
    created_at: '2026-01-01T10:00:00.000Z',
  },
  {
    id: 'an-2',
    asociatie_id: 'asoc-x',
    sender_user_id: 'u-res',
    body: 'Second message',
    status: 'rezolvat',
    created_at: '2026-01-02T10:00:00.000Z',
  },
];

beforeEach(() => {
  useAnonymousStore.setState({ messages: [...SEED] });
});

describe('useAnonymousStore — replaceAll', () => {
  it('replaces the entire message list', () => {
    const fresh: AnonymousMessage[] = [
      {
        id: 'an-99',
        asociatie_id: 'asoc-x',
        body: 'Only one',
        status: 'nou',
        created_at: '2026-01-03T10:00:00.000Z',
      },
    ];
    useAnonymousStore.getState().replaceAll(fresh);
    expect(useAnonymousStore.getState().messages).toHaveLength(1);
    expect(useAnonymousStore.getState().messages[0].id).toBe('an-99');
  });

  it('replaceAll with empty array empties the list', () => {
    useAnonymousStore.getState().replaceAll([]);
    expect(useAnonymousStore.getState().messages).toHaveLength(0);
  });
});

describe('useAnonymousStore — setStatus', () => {
  it('sets a specific status without toggling', () => {
    useAnonymousStore.getState().setStatus('an-1', 'rezolvat');
    const m = useAnonymousStore.getState().messages.find((x) => x.id === 'an-1');
    expect(m?.status).toBe('rezolvat');
  });

  it('can re-open a resolved message', () => {
    useAnonymousStore.getState().setStatus('an-2', 'nou');
    const m = useAnonymousStore.getState().messages.find((x) => x.id === 'an-2');
    expect(m?.status).toBe('nou');
  });

  it('does not touch other messages', () => {
    useAnonymousStore.getState().setStatus('an-1', 'rezolvat');
    const m2 = useAnonymousStore.getState().messages.find((x) => x.id === 'an-2');
    expect(m2?.status).toBe('rezolvat');
  });
});

describe('hydrateAnonymousMessages', () => {
  it('is a no-op when Supabase is not configured (offline/CI)', async () => {
    const before = useAnonymousStore.getState().messages;
    await hydrateAnonymousMessages('asoc-x', false, 'u-res');
    expect(useAnonymousStore.getState().messages).toBe(before);
  });

  it('is a no-op when asociatieId is empty', async () => {
    const before = useAnonymousStore.getState().messages;
    await hydrateAnonymousMessages('', false, 'u-res');
    expect(useAnonymousStore.getState().messages).toBe(before);
  });
});

describe('submitAnonymousMessage', () => {
  it('prepends a new message to the store', () => {
    submitAnonymousMessage('asoc-x', 'A new concern', 'u-res');
    const msgs = useAnonymousStore.getState().messages;
    expect(msgs).toHaveLength(3);
    expect(msgs[0].body).toBe('A new concern');
    expect(msgs[0].status).toBe('nou');
    expect(msgs[0].asociatie_id).toBe('asoc-x');
    expect(msgs[0].sender_user_id).toBe('u-res');
  });

  it('trims the body before storing', () => {
    submitAnonymousMessage('asoc-x', '  leading + trailing spaces  ', 'u-res');
    const msgs = useAnonymousStore.getState().messages;
    expect(msgs[0].body).toBe('leading + trailing spaces');
  });

  it('keeps the pre-existing messages after multiple submits', () => {
    submitAnonymousMessage('asoc-x', 'msg one', 'u-res');
    submitAnonymousMessage('asoc-x', 'msg two', 'u-res');
    const msgs = useAnonymousStore.getState().messages;
    // 2 original + 2 submitted
    expect(msgs).toHaveLength(4);
    expect(msgs.map((m) => m.body)).toContain('msg one');
    expect(msgs.map((m) => m.body)).toContain('msg two');
  });
});

describe('setAnonymousMessageStatus', () => {
  it('sets the status in the store', () => {
    setAnonymousMessageStatus('an-1', 'rezolvat');
    const m = useAnonymousStore.getState().messages.find((x) => x.id === 'an-1');
    expect(m?.status).toBe('rezolvat');
  });

  it('does not affect other messages', () => {
    setAnonymousMessageStatus('an-1', 'rezolvat');
    const m2 = useAnonymousStore.getState().messages.find((x) => x.id === 'an-2');
    expect(m2?.status).toBe('rezolvat');
  });
});
