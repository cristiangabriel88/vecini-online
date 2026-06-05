import { describe, expect, it, beforeEach } from 'vitest';
import { usePlatformTeamStore } from '@/platform/platformTeamStore';
import { DEMO_PLATFORM_TEAM } from '@/platform/demoPlatform';

/**
 * T251 - Unit tests for the platform team management store.
 * Covers inviteAdmin, revokeAdmin, cancelInvite, and the last-admin guard.
 */

beforeEach(() => {
  usePlatformTeamStore.setState({
    admins: DEMO_PLATFORM_TEAM.map((a) => ({ ...a })),
    pendingInvites: [],
    fetchError: null,
  });
});

describe('inviteAdmin', () => {
  it('adds a pending invite with the supplied name and email', () => {
    usePlatformTeamStore.getState().inviteAdmin('Radu Ionescu', 'radu@vecini.online');
    const invites = usePlatformTeamStore.getState().pendingInvites;
    expect(invites).toHaveLength(1);
    expect(invites[0].name).toBe('Radu Ionescu');
    expect(invites[0].email).toBe('radu@vecini.online');
  });

  it('returns the created invite object', () => {
    const invite = usePlatformTeamStore.getState().inviteAdmin('Elena Marin', 'elena@test.ro');
    expect(invite.id).toBeTruthy();
    expect(invite.invitedAt).toBeTruthy();
  });

  it('accumulates multiple pending invites', () => {
    usePlatformTeamStore.getState().inviteAdmin('A', 'a@test.ro');
    usePlatformTeamStore.getState().inviteAdmin('B', 'b@test.ro');
    expect(usePlatformTeamStore.getState().pendingInvites).toHaveLength(2);
  });

  it('does not modify the admins list', () => {
    const before = usePlatformTeamStore.getState().admins.length;
    usePlatformTeamStore.getState().inviteAdmin('X', 'x@test.ro');
    expect(usePlatformTeamStore.getState().admins).toHaveLength(before);
  });
});

describe('revokeAdmin', () => {
  it('removes the target admin from the roster', () => {
    const targetId = DEMO_PLATFORM_TEAM[1].userId;
    usePlatformTeamStore.getState().revokeAdmin(targetId);
    const admins = usePlatformTeamStore.getState().admins;
    expect(admins.find((a) => a.userId === targetId)).toBeUndefined();
  });

  it('does not remove the last remaining admin', () => {
    // Remove all but one, then try to remove the last.
    usePlatformTeamStore.setState({ admins: [DEMO_PLATFORM_TEAM[0]] });
    usePlatformTeamStore.getState().revokeAdmin(DEMO_PLATFORM_TEAM[0].userId);
    expect(usePlatformTeamStore.getState().admins).toHaveLength(1);
  });

  it('does nothing when userId is unknown', () => {
    const before = usePlatformTeamStore.getState().admins.length;
    usePlatformTeamStore.getState().revokeAdmin('nonexistent-id');
    expect(usePlatformTeamStore.getState().admins).toHaveLength(before);
  });

  it('leaves other admins untouched', () => {
    const keepId = DEMO_PLATFORM_TEAM[0].userId;
    const removeId = DEMO_PLATFORM_TEAM[1].userId;
    usePlatformTeamStore.getState().revokeAdmin(removeId);
    expect(usePlatformTeamStore.getState().admins.find((a) => a.userId === keepId)).toBeDefined();
  });
});

describe('cancelInvite', () => {
  it('removes the invite from pendingInvites by id', () => {
    const inv = usePlatformTeamStore.getState().inviteAdmin('Test', 'test@test.ro');
    usePlatformTeamStore.getState().cancelInvite(inv.id);
    expect(usePlatformTeamStore.getState().pendingInvites).toHaveLength(0);
  });

  it('does nothing when id is unknown', () => {
    usePlatformTeamStore.getState().inviteAdmin('Test', 'test@test.ro');
    usePlatformTeamStore.getState().cancelInvite('nonexistent-id');
    expect(usePlatformTeamStore.getState().pendingInvites).toHaveLength(1);
  });

  it('only removes the matching invite when multiple exist', () => {
    const a = usePlatformTeamStore.getState().inviteAdmin('A', 'a@test.ro');
    usePlatformTeamStore.getState().inviteAdmin('B', 'b@test.ro');
    usePlatformTeamStore.getState().cancelInvite(a.id);
    const remaining = usePlatformTeamStore.getState().pendingInvites;
    expect(remaining).toHaveLength(1);
    expect(remaining[0].email).toBe('b@test.ro');
  });
});

describe('replaceAdmins', () => {
  it('replaces the entire admin roster', () => {
    const newRoster = [{ userId: 'new-1', name: 'New Admin', email: 'new@test.ro', grantedAt: '2026-01-01T00:00:00Z', lastSignInAt: null }];
    usePlatformTeamStore.getState().replaceAdmins(newRoster);
    expect(usePlatformTeamStore.getState().admins).toHaveLength(1);
    expect(usePlatformTeamStore.getState().admins[0].email).toBe('new@test.ro');
  });
});
