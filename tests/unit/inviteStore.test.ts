import { beforeEach, describe, expect, it } from 'vitest';
import { useInviteStore } from '@/shared/store/inviteStore';

/**
 * Integration coverage for the invite store's token redemption path (T123):
 * `consumeByToken` matches a code by the opaque onboarding-link token and is
 * replay-safe, mirroring `consume` by code. The redeem-by-link landing (T124)
 * builds on it.
 */
beforeEach(() => useInviteStore.setState({ invites: [] }));

describe('useInviteStore.consumeByToken', () => {
  it('consumes a code matched by its token, marking it used by the joiner', () => {
    const invite = useInviteStore.getState().issue({ asociatieId: 'asoc-1' });

    const result = useInviteStore.getState().consumeByToken(invite.token, 'u-joiner');

    expect(result.status).toBe('ok');
    expect(result.invite?.id).toBe(invite.id);
    expect(useInviteStore.getState().invites[0].consumedByUserId).toBe('u-joiner');
  });

  it('is replay-safe: a single-use token cannot be redeemed twice', () => {
    const invite = useInviteStore.getState().issue({ asociatieId: 'asoc-2' });

    expect(useInviteStore.getState().consumeByToken(invite.token, 'u-1').status).toBe('ok');
    const second = useInviteStore.getState().consumeByToken(invite.token, 'u-2');
    expect(second.status).toBe('used');
    expect(second.invite).toBeNull();
    // The first consumer keeps the code; the replay does not overwrite it.
    expect(useInviteStore.getState().invites[0].consumedByUserId).toBe('u-1');
  });

  it('reports unknown for a token that matches no issued code', () => {
    useInviteStore.getState().issue({ asociatieId: 'asoc-3' });
    const result = useInviteStore.getState().consumeByToken('f'.repeat(64), 'u-1');
    expect(result.status).toBe('unknown');
    expect(result.invite).toBeNull();
  });
});
