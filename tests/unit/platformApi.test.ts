import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { usePlatformAsociatiiStore, type LiveAdminInvite } from '@/platform/platformAsociatiiStore';
import { DEMO_PLATFORM_ASOCIATII } from '@/platform/demoPlatform';

const SRC = readFileSync(join(process.cwd(), 'src', 'platform', 'platformApi.ts'), 'utf8');

// Supabase is not configured in the test environment, so hydrateAsociatiiList
// is a no-op and the store retains its seeded demo data.

beforeEach(() => {
  usePlatformAsociatiiStore.setState({
    asociatii: DEMO_PLATFORM_ASOCIATII,
    fetchError: null,
  });
});

describe('platformApi source contract', () => {
  it('short-circuits hydration when Supabase is not configured', () => {
    expect(SRC).toContain('if (!isSupabaseConfigured) return;');
  });

  it('keeps the optional status columns out of the primary list query', () => {
    expect(SRC).toContain("select('id, name, address, cui, iban, contact_phone, contact_email')");
  });
});

describe('platformAsociatiiStore.replaceAsociatii', () => {
  it('replaces the asociatii list with the provided rows', () => {
    const newRows = [
      {
        id: 'live-1',
        name: 'Asociatia Live',
        city: '',
        members: 10,
        apartments: 8,
        lastAdminSignInAt: '2026-06-01T10:00:00Z',
      },
    ];
    usePlatformAsociatiiStore.getState().replaceAsociatii(newRows);
    const { asociatii } = usePlatformAsociatiiStore.getState();
    expect(asociatii).toHaveLength(1);
    expect(asociatii[0].id).toBe('live-1');
    expect(asociatii[0].members).toBe(10);
  });

  it('can be called with an empty array to clear the list', () => {
    usePlatformAsociatiiStore.getState().replaceAsociatii([]);
    expect(usePlatformAsociatiiStore.getState().asociatii).toHaveLength(0);
  });
});

describe('platformAsociatiiStore.setFetchError', () => {
  it('sets a non-null error', () => {
    usePlatformAsociatiiStore.getState().setFetchError('load');
    expect(usePlatformAsociatiiStore.getState().fetchError).toBe('load');
  });

  it('clears the error when passed null', () => {
    usePlatformAsociatiiStore.getState().setFetchError('load');
    usePlatformAsociatiiStore.getState().setFetchError(null);
    expect(usePlatformAsociatiiStore.getState().fetchError).toBeNull();
  });
});

// ── T298: replaceFromLive ─────────────────────────────────────────────────────

const FUTURE = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
const PAST = new Date(Date.now() - 60 * 1000).toISOString();
const NOW_ISO = new Date().toISOString();

function makeInvite(overrides: Partial<LiveAdminInvite> & { id: string; asociatieId: string }): LiveAdminInvite {
  return {
    inviteeName: 'Admin Popescu',
    inviteeEmail: 'admin@example.com',
    expiresAt: FUTURE,
    consumedAt: null,
    revokedAt: null,
    createdAt: NOW_ISO,
    emailSentAt: null,
    ...overrides,
  };
}

describe('platformAsociatiiStore.replaceFromLive', () => {
  beforeEach(() => {
    usePlatformAsociatiiStore.setState({
      pendingInvites: [],
      revokedInviteIds: [],
      provisions: {},
      additionalAdmins: {},
    });
  });

  it('maps an unconsumed, unexpired invite to pendingInvites', () => {
    const inv = makeInvite({ id: 'inv-1', asociatieId: 'asoc-1' });
    usePlatformAsociatiiStore.getState().replaceFromLive([inv]);
    const { pendingInvites } = usePlatformAsociatiiStore.getState();
    expect(pendingInvites).toHaveLength(1);
    expect(pendingInvites[0].id).toBe('inv-1');
    expect(pendingInvites[0].adminName).toBe('Admin Popescu');
    expect(pendingInvites[0].adminEmail).toBe('admin@example.com');
    expect(pendingInvites[0].setupToken).toBe('');
  });

  it('does not put a consumed invite into pendingInvites', () => {
    const inv = makeInvite({ id: 'inv-2', asociatieId: 'asoc-1', consumedAt: NOW_ISO });
    usePlatformAsociatiiStore.getState().replaceFromLive([inv]);
    expect(usePlatformAsociatiiStore.getState().pendingInvites).toHaveLength(0);
  });

  it('adds an expired invite id to revokedInviteIds and not to pendingInvites', () => {
    const inv = makeInvite({ id: 'inv-3', asociatieId: 'asoc-1', expiresAt: PAST });
    usePlatformAsociatiiStore.getState().replaceFromLive([inv]);
    const { pendingInvites, revokedInviteIds } = usePlatformAsociatiiStore.getState();
    expect(pendingInvites).toHaveLength(0);
    expect(revokedInviteIds).toContain('inv-3');
  });

  it('adds an explicitly revoked invite id to revokedInviteIds', () => {
    const inv = makeInvite({ id: 'inv-4', asociatieId: 'asoc-1', revokedAt: PAST });
    usePlatformAsociatiiStore.getState().replaceFromLive([inv]);
    expect(usePlatformAsociatiiStore.getState().revokedInviteIds).toContain('inv-4');
  });

  it('assigns the oldest invite per asociatieId to provisions and the rest to additionalAdmins', () => {
    const first = makeInvite({ id: 'inv-first', asociatieId: 'asoc-1', createdAt: '2026-06-01T10:00:00Z' });
    const second = makeInvite({ id: 'inv-second', asociatieId: 'asoc-1', createdAt: '2026-06-02T10:00:00Z', inviteeEmail: 'second@example.com' });
    usePlatformAsociatiiStore.getState().replaceFromLive([first, second]);
    const { provisions, additionalAdmins } = usePlatformAsociatiiStore.getState();
    expect(provisions['asoc-1']?.inviteId).toBe('inv-first');
    expect(additionalAdmins['asoc-1']).toHaveLength(1);
    expect(additionalAdmins['asoc-1'][0].inviteId).toBe('inv-second');
  });

  it('maps consumedAt to redeemedAt in the admin roster record', () => {
    const consumedAt = '2026-06-05T08:00:00Z';
    const inv = makeInvite({ id: 'inv-5', asociatieId: 'asoc-2', consumedAt });
    usePlatformAsociatiiStore.getState().replaceFromLive([inv]);
    const rec = usePlatformAsociatiiStore.getState().provisions['asoc-2'];
    expect(rec?.redeemedAt).toBe(new Date(consumedAt).getTime());
  });

  it('clears existing pendingInvites and roster when called with empty array', () => {
    usePlatformAsociatiiStore.setState({
      pendingInvites: [{ id: 'old', adminName: 'x', adminEmail: 'x@x.com', setupToken: '', expiresAt: 0, invitedAt: '', emailSentAt: null }],
      revokedInviteIds: ['old'],
      provisions: { 'asoc-old': { asociatieId: 'asoc-old', name: 'x', email: 'x@x.com', setupCode: '', setupToken: '', expiresAt: 0, redeemedAt: null, provisionedAt: '' } },
      additionalAdmins: {},
    });
    usePlatformAsociatiiStore.getState().replaceFromLive([]);
    const s = usePlatformAsociatiiStore.getState();
    expect(s.pendingInvites).toHaveLength(0);
    expect(s.revokedInviteIds).toHaveLength(0);
    expect(Object.keys(s.provisions)).toHaveLength(0);
  });
});

describe('platformApi source contract — hydrateInvitesAndRoster', () => {
  const SRC2 = readFileSync(join(process.cwd(), 'src', 'platform', 'platformApi.ts'), 'utf8');

  it('short-circuits when Supabase is not configured', () => {
    expect(SRC2).toContain('hydrateInvitesAndRoster');
    expect(SRC2).toContain("if (!isSupabaseConfigured) return;");
  });

  it('calls the platform-list-invites function', () => {
    expect(SRC2).toContain('platform-list-invites');
  });

  it('calls replaceFromLive on the store', () => {
    expect(SRC2).toContain('replaceFromLive');
  });
});
