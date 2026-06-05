import { describe, expect, it, beforeEach } from 'vitest';
import { usePlatformAsociatiiStore } from '@/platform/platformAsociatiiStore';
import { DEMO_PLATFORM_ASOCIATII } from '@/platform/demoPlatform';

/**
 * T250 - Unit tests for the platform admin roster store actions.
 * Covers revokeInvite, resendInvite, provisionAdditionalAdmin, revokeAdminAccess.
 */

const ASOC_ID = DEMO_PLATFORM_ASOCIATII[0].id;

beforeEach(() => {
  usePlatformAsociatiiStore.setState({
    asociatii: DEMO_PLATFORM_ASOCIATII.map((a) => ({ ...a })),
    provisions: {},
    pendingInvites: [],
    revokedInviteIds: [],
    additionalAdmins: {},
    listFilter: 'all',
  });
});

describe('revokeInvite', () => {
  it('adds the invite id to revokedInviteIds', () => {
    const invite = usePlatformAsociatiiStore.getState().inviteAdmin('Ana Pop', 'ana@test.ro');
    usePlatformAsociatiiStore.getState().revokeInvite(invite.id);
    expect(usePlatformAsociatiiStore.getState().revokedInviteIds).toContain(invite.id);
  });

  it('does not remove the invite from pendingInvites (filter applied at the view layer)', () => {
    const invite = usePlatformAsociatiiStore.getState().inviteAdmin('Ana Pop', 'ana@test.ro');
    usePlatformAsociatiiStore.getState().revokeInvite(invite.id);
    expect(usePlatformAsociatiiStore.getState().pendingInvites).toHaveLength(1);
  });

  it('is idempotent -- revoking twice does not duplicate the id', () => {
    const invite = usePlatformAsociatiiStore.getState().inviteAdmin('Ion', 'ion@test.ro');
    usePlatformAsociatiiStore.getState().revokeInvite(invite.id);
    usePlatformAsociatiiStore.getState().revokeInvite(invite.id);
    const ids = usePlatformAsociatiiStore.getState().revokedInviteIds.filter((x) => x === invite.id);
    expect(ids.length).toBeGreaterThanOrEqual(1);
  });

  it('does nothing when invite id is unknown', () => {
    usePlatformAsociatiiStore.getState().revokeInvite('nonexistent-id');
    expect(usePlatformAsociatiiStore.getState().revokedInviteIds).toHaveLength(0);
  });
});

describe('resendInvite', () => {
  it('remints the setup token and resets expiresAt', () => {
    const invite = usePlatformAsociatiiStore.getState().inviteAdmin('Maria', 'maria@test.ro');
    const oldToken = invite.setupToken;
    const oldExpiry = invite.expiresAt;
    const updated = usePlatformAsociatiiStore.getState().resendInvite(invite.id);
    expect(updated).not.toBeNull();
    expect(updated!.setupToken).not.toBe(oldToken);
    expect(updated!.expiresAt).toBeGreaterThanOrEqual(oldExpiry);
  });

  it('clears emailSentAt after resend', () => {
    const invite = usePlatformAsociatiiStore.getState().inviteAdmin('Maria', 'maria@test.ro');
    usePlatformAsociatiiStore.getState().markAdminEmailSent(invite.id);
    expect(usePlatformAsociatiiStore.getState().pendingInvites[0].emailSentAt).not.toBeNull();
    usePlatformAsociatiiStore.getState().resendInvite(invite.id);
    expect(usePlatformAsociatiiStore.getState().pendingInvites[0].emailSentAt).toBeNull();
  });

  it('returns null for an unknown invite id', () => {
    const result = usePlatformAsociatiiStore.getState().resendInvite('nonexistent');
    expect(result).toBeNull();
  });
});

describe('provisionAdditionalAdmin', () => {
  it('adds a record to additionalAdmins for the given asociatieId', () => {
    usePlatformAsociatiiStore.getState().provisionAdditionalAdmin(ASOC_ID, 'George', 'george@test.ro');
    const admins = usePlatformAsociatiiStore.getState().additionalAdmins[ASOC_ID];
    expect(admins).toHaveLength(1);
    expect(admins[0].name).toBe('George');
    expect(admins[0].email).toBe('george@test.ro');
  });

  it('accumulates multiple additional admins', () => {
    usePlatformAsociatiiStore.getState().provisionAdditionalAdmin(ASOC_ID, 'A', 'a@test.ro');
    usePlatformAsociatiiStore.getState().provisionAdditionalAdmin(ASOC_ID, 'B', 'b@test.ro');
    expect(usePlatformAsociatiiStore.getState().additionalAdmins[ASOC_ID]).toHaveLength(2);
  });

  it('initialises revokedAt to null', () => {
    const record = usePlatformAsociatiiStore
      .getState()
      .provisionAdditionalAdmin(ASOC_ID, 'C', 'c@test.ro');
    expect(record.revokedAt).toBeNull();
  });

  it('does not affect admins for other asociatii', () => {
    const otherId = DEMO_PLATFORM_ASOCIATII[1].id;
    usePlatformAsociatiiStore.getState().provisionAdditionalAdmin(ASOC_ID, 'X', 'x@test.ro');
    expect(usePlatformAsociatiiStore.getState().additionalAdmins[otherId] ?? []).toHaveLength(0);
  });
});

describe('revokeAdminAccess', () => {
  it('sets revokedAt on an additional admin matched by email', () => {
    usePlatformAsociatiiStore.getState().provisionAdditionalAdmin(ASOC_ID, 'Dan', 'dan@test.ro');
    usePlatformAsociatiiStore.getState().revokeAdminAccess(ASOC_ID, 'dan@test.ro');
    const rec = usePlatformAsociatiiStore.getState().additionalAdmins[ASOC_ID][0];
    expect(rec.revokedAt).toBeTruthy();
  });

  it('sets revokedAt on the primary provision record when email matches', () => {
    usePlatformAsociatiiStore.setState((s) => ({
      provisions: {
        ...s.provisions,
        [ASOC_ID]: {
          asociatieId: ASOC_ID,
          name: 'Elena',
          email: 'elena@test.ro',
          setupCode: 'CODE',
          setupToken: 'TOKEN',
          expiresAt: Date.now() + 86400000,
          redeemedAt: Date.now(),
          provisionedAt: new Date().toISOString(),
          revokedAt: null,
        },
      },
    }));
    usePlatformAsociatiiStore.getState().revokeAdminAccess(ASOC_ID, 'elena@test.ro');
    expect(usePlatformAsociatiiStore.getState().provisions[ASOC_ID].revokedAt).toBeTruthy();
  });

  it('does not affect other admins', () => {
    usePlatformAsociatiiStore.getState().provisionAdditionalAdmin(ASOC_ID, 'P', 'p@test.ro');
    usePlatformAsociatiiStore.getState().provisionAdditionalAdmin(ASOC_ID, 'Q', 'q@test.ro');
    usePlatformAsociatiiStore.getState().revokeAdminAccess(ASOC_ID, 'p@test.ro');
    const admins = usePlatformAsociatiiStore.getState().additionalAdmins[ASOC_ID];
    expect(admins.find((r) => r.email === 'q@test.ro')?.revokedAt).toBeFalsy();
    expect(admins.find((r) => r.email === 'p@test.ro')?.revokedAt).toBeTruthy();
  });
});
