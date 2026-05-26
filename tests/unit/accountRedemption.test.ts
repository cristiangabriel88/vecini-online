import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from '@/shared/store/authStore';
import { useInviteStore } from '@/shared/store/inviteStore';
import { usePlatformAsociatiiStore } from '@/platform/platformAsociatiiStore';
import { DEMO_CURRENT_USER_ID } from '@/shared/demo/demoData';

/**
 * Integration coverage for the account-creation-on-redemption stores (T124):
 * `authStore.redeemInvite` (token + manual code, replay-safe) and the admin
 * setup path (`platformAsociatiiStore.consumeSetup` + `activateProvisionedAdmin`).
 * Exercises the offline path (no session -> demo user id + demo session).
 */
function resetStores() {
  useInviteStore.setState({ invites: [] });
  useAuthStore.setState({
    session: null,
    profile: null,
    memberships: [],
    currentAsociatieId: null,
    isPlatformSuperAdmin: false,
    localAsociatii: [],
    demo: false,
  });
  usePlatformAsociatiiStore.setState({ provisions: {}, asociatii: [] });
}

beforeEach(resetStores);

describe('authStore.redeemInvite (locatar invite path)', () => {
  it('redeems by the opaque token: links the granted membership and opens the demo session', () => {
    const invite = useInviteStore.getState().issue({ asociatieId: 'asoc-join', role: 'proprietar' });

    const result = useAuthStore.getState().redeemInvite(invite.token);

    expect(result.status).toBe('ok');
    expect(result.asociatieId).toBe('asoc-join');
    const state = useAuthStore.getState();
    expect(state.currentAsociatieId).toBe('asoc-join');
    expect(state.demo).toBe(true);
    expect(state.memberships).toHaveLength(1);
    expect(state.memberships[0]).toMatchObject({
      user_id: DEMO_CURRENT_USER_ID,
      asociatie_id: 'asoc-join',
      role: 'proprietar',
    });
    expect(useInviteStore.getState().invites[0].consumedByUserId).toBe(DEMO_CURRENT_USER_ID);
  });

  it('redeems by the short manual code as the fallback', () => {
    const invite = useInviteStore.getState().issue({ asociatieId: 'asoc-2', role: 'chirias' });
    const result = useAuthStore.getState().redeemInvite(invite.code);
    expect(result.status).toBe('ok');
    expect(useAuthStore.getState().memberships[0].role).toBe('chirias');
  });

  it('is replay-safe: a single-use token cannot be redeemed twice', () => {
    const invite = useInviteStore.getState().issue({ asociatieId: 'asoc-3' });
    expect(useAuthStore.getState().redeemInvite(invite.token).status).toBe('ok');
    const second = useAuthStore.getState().redeemInvite(invite.token);
    expect(second.status).toBe('used');
    expect(second.asociatieId).toBeNull();
    expect(useAuthStore.getState().memberships).toHaveLength(1);
  });

  it('reports unknown for a token that matches no code, without changing state', () => {
    const result = useAuthStore.getState().redeemInvite('f'.repeat(64));
    expect(result.status).toBe('unknown');
    expect(useAuthStore.getState().memberships).toHaveLength(0);
    expect(useAuthStore.getState().demo).toBe(false);
  });
});

describe('admin setup path (consumeSetup + activateProvisionedAdmin)', () => {
  function seedProvision() {
    usePlatformAsociatiiStore.setState({
      asociatii: [
        {
          id: 'platform-asoc-1',
          name: 'Asociația Bloc 7',
          city: 'Cluj',
          members: 0,
          apartments: 0,
          lastAdminSignInAt: null,
          address: '',
          cui: '',
          registrationNumber: '',
          iban: '',
          contactPhone: '',
          contactEmail: '',
        },
      ],
      provisions: {
        'platform-asoc-1': {
          asociatieId: 'platform-asoc-1',
          name: 'Ana Admin',
          email: 'ana@example.com',
          setupCode: 'SETUP234',
          setupToken: 'a'.repeat(64),
          expiresAt: Date.now() + 60_000,
          redeemedAt: null,
          provisionedAt: new Date().toISOString(),
        },
      },
    });
  }

  it('consumes the setup token and activates the new admin as founder', () => {
    seedProvision();
    const consumed = usePlatformAsociatiiStore.getState().consumeSetup('a'.repeat(64));
    expect(consumed.status).toBe('ok');
    expect(consumed.asociatieId).toBe('platform-asoc-1');
    expect(consumed.asociatieName).toBe('Asociația Bloc 7');

    useAuthStore.getState().activateProvisionedAdmin(consumed.asociatieId!, consumed.asociatieName!);
    const state = useAuthStore.getState();
    expect(state.currentAsociatieId).toBe('platform-asoc-1');
    expect(state.demo).toBe(true);
    expect(state.memberships[0].role).toBe('admin');
    expect(state.localAsociatii).toContainEqual({ id: 'platform-asoc-1', name: 'Asociația Bloc 7' });
  });

  it('consumes by the short setup code as the fallback', () => {
    seedProvision();
    expect(usePlatformAsociatiiStore.getState().consumeSetup('setup234').status).toBe('ok');
  });

  it('is replay-safe: a setup link cannot be redeemed twice', () => {
    seedProvision();
    expect(usePlatformAsociatiiStore.getState().consumeSetup('a'.repeat(64)).status).toBe('ok');
    const second = usePlatformAsociatiiStore.getState().consumeSetup('a'.repeat(64));
    expect(second.status).toBe('used');
    expect(second.asociatieId).toBeNull();
  });

  it('reports unknown for a setup value that matches nothing', () => {
    seedProvision();
    expect(usePlatformAsociatiiStore.getState().consumeSetup('b'.repeat(64)).status).toBe('unknown');
  });
});
