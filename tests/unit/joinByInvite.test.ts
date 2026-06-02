import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from '@/shared/store/authStore';
import { useInviteStore } from '@/shared/store/inviteStore';
import { DEMO_CURRENT_USER_ID } from '@/shared/demo/demoData';

/**
 * Integration coverage for the resident join-by-invite flow (T42): the auth
 * store consumes a code through the invite store once (replay-safe) and links
 * the granted membership, selecting the asociație. Exercises the offline path
 * (no session → demo user id).
 */
function resetStores() {
  useInviteStore.setState({ invites: [] });
  useAuthStore.setState({
    session: null,
    profile: null,
    memberships: [],
    currentAsociatieId: null,
    localAsociatii: [],
  });
}

beforeEach(resetStores);

describe('authStore.joinByInvite', () => {
  it('redeems a valid code: links the granted membership and selects the asociație', () => {
    const invite = useInviteStore
      .getState()
      .issue({ asociatieId: 'asoc-join', role: 'proprietar' });

    const result = useAuthStore.getState().joinByInvite(invite.code);

    expect(result.status).toBe('ok');
    expect(result.asociatieId).toBe('asoc-join');
    const state = useAuthStore.getState();
    expect(state.currentAsociatieId).toBe('asoc-join');
    expect(state.memberships).toHaveLength(1);
    expect(state.memberships[0]).toMatchObject({
      user_id: DEMO_CURRENT_USER_ID,
      asociatie_id: 'asoc-join',
      role: 'proprietar',
      ended_at: null,
    });
    // The code is now spent.
    expect(useInviteStore.getState().invites[0].consumedByUserId).toBe(DEMO_CURRENT_USER_ID);
  });

  it('populates localAsociatii with the name embedded in the invite', () => {
    const invite = useInviteStore
      .getState()
      .issue({ asociatieId: 'asoc-named', role: 'proprietar', asociatieName: 'Bloc 7, Scara B' });

    useAuthStore.getState().joinByInvite(invite.code);

    const entry = useAuthStore
      .getState()
      .localAsociatii.find((a) => a.id === 'asoc-named');
    expect(entry).toBeDefined();
    expect(entry?.name).toBe('Bloc 7, Scara B');
  });

  it('populates localAsociatii with empty name when invite carries none', () => {
    const invite = useInviteStore
      .getState()
      .issue({ asociatieId: 'asoc-noname', role: 'proprietar' });

    useAuthStore.getState().joinByInvite(invite.code);

    const entry = useAuthStore
      .getState()
      .localAsociatii.find((a) => a.id === 'asoc-noname');
    expect(entry).toBeDefined();
    expect(entry?.name).toBe('');
  });

  it('backfills a blank localAsociatii entry when the invite carries a name', () => {
    useAuthStore.setState({
      localAsociatii: [{ id: 'asoc-blank', name: '' }],
    });
    const invite = useInviteStore
      .getState()
      .issue({ asociatieId: 'asoc-blank', role: 'proprietar', asociatieName: 'Bloc 3' });

    useAuthStore.getState().joinByInvite(invite.code);

    const entry = useAuthStore
      .getState()
      .localAsociatii.find((a) => a.id === 'asoc-blank');
    expect(entry?.name).toBe('Bloc 3');
  });

  it('is replay-safe: a single-use code cannot be redeemed twice', () => {
    const invite = useInviteStore.getState().issue({ asociatieId: 'asoc-2' });

    const first = useAuthStore.getState().joinByInvite(invite.code);
    const second = useAuthStore.getState().joinByInvite(invite.code);

    expect(first.status).toBe('ok');
    expect(second.status).toBe('used');
    expect(second.asociatieId).toBeNull();
    // No duplicate membership from the replayed attempt.
    expect(useAuthStore.getState().memberships).toHaveLength(1);
  });

  it('reports unknown for a code that was never issued, without changing state', () => {
    const result = useAuthStore.getState().joinByInvite('NOPE2345');
    expect(result.status).toBe('unknown');
    expect(useAuthStore.getState().memberships).toHaveLength(0);
    expect(useAuthStore.getState().currentAsociatieId).toBeNull();
  });

  it('reports revoked for a revoked code and creates no membership', () => {
    const invite = useInviteStore.getState().issue({ asociatieId: 'asoc-3' });
    useInviteStore.getState().revoke(invite.id);

    const result = useAuthStore.getState().joinByInvite(invite.code);
    expect(result.status).toBe('revoked');
    expect(useAuthStore.getState().memberships).toHaveLength(0);
  });

  it('does not waste a single-use code when the user is already a member', () => {
    // A reusable code so we can confirm the second call short-circuits, not the
    // single-use lifecycle, on the already-member path.
    const invite = useInviteStore
      .getState()
      .issue({ asociatieId: 'asoc-4', singleUse: false });

    useAuthStore.getState().joinByInvite(invite.code); // becomes a member
    const consumedAtAfterFirst = useInviteStore.getState().invites[0].consumedAt;

    const again = useAuthStore.getState().joinByInvite(invite.code);
    expect(again.status).toBe('ok');
    expect(again.asociatieId).toBe('asoc-4');
    // Still one membership, and the second call short-circuited before consuming.
    expect(useAuthStore.getState().memberships).toHaveLength(1);
    expect(useInviteStore.getState().invites[0].consumedAt).toBe(consumedAtAfterFirst);
  });

  it('normalises the entered code (whitespace, case, separators)', () => {
    const invite = useInviteStore.getState().issue({ asociatieId: 'asoc-5' });
    const messy = ` ${invite.code.slice(0, 4)}-${invite.code.slice(4).toLowerCase()} `;
    const result = useAuthStore.getState().joinByInvite(messy);
    expect(result.status).toBe('ok');
    expect(result.asociatieId).toBe('asoc-5');
  });
});
