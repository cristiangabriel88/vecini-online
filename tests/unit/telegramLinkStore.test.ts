import { beforeEach, describe, expect, it } from 'vitest';
import { useTelegramLinkStore } from '@/shared/store/telegramLinkStore';
import { useInviteStore } from '@/shared/store/inviteStore';
import type { TelegramUserInfo } from '@/features/telegram/telegramLinkLogic';

/**
 * Integration coverage for the local/mock Telegram linking path (T50): a
 * resident-minted per-user link code resolves and is recorded offline, while the
 * invite-code path validates but is left to the live join RPC to persist (T58).
 */
const USER: TelegramUserInfo = { telegramUserId: 777, username: 'ana', firstName: 'Ana' };

function resetStores() {
  useTelegramLinkStore.setState({ linkCodes: [], links: [] });
  useInviteStore.setState({ invites: [] });
}

beforeEach(resetStores);

describe('telegramLinkStore.linkByPayload', () => {
  it('asks for a code when no payload is sent', () => {
    const out = useTelegramLinkStore.getState().linkByPayload(null, USER);
    expect(out.status).toBe('no-code');
    expect(useTelegramLinkStore.getState().links).toHaveLength(0);
  });

  it('redeems a per-user link code: records the link and consumes the code', () => {
    const code = useTelegramLinkStore
      .getState()
      .issueLinkCode({ userId: 'u-7', asociatieId: 'asoc-7', role: 'proprietar' });

    const out = useTelegramLinkStore.getState().linkByPayload(code.code, USER);

    expect(out.status).toBe('linked');
    const state = useTelegramLinkStore.getState();
    expect(state.links).toHaveLength(1);
    expect(state.links[0]).toMatchObject({
      telegramUserId: 777,
      userId: 'u-7',
      asociatieId: 'asoc-7',
      source: 'link-code',
    });
    expect(state.linkCodes[0].consumedByTelegramId).toBe(777);
  });

  it('is replay-safe: a consumed link code reads as used and links once', () => {
    const code = useTelegramLinkStore
      .getState()
      .issueLinkCode({ userId: 'u-7', asociatieId: 'asoc-7', role: 'proprietar' });

    const first = useTelegramLinkStore.getState().linkByPayload(code.code, USER);
    // A different Telegram user trying the same single-use code is rejected.
    const second = useTelegramLinkStore
      .getState()
      .linkByPayload(code.code, { telegramUserId: 888 });

    expect(first.status).toBe('linked');
    expect(second.status).toBe('used');
    expect(useTelegramLinkStore.getState().links).toHaveLength(1);
  });

  it('reports already-linked when the Telegram user is bound, without wasting a code', () => {
    const code = useTelegramLinkStore
      .getState()
      .issueLinkCode({ userId: 'u-7', asociatieId: 'asoc-7', role: 'proprietar' });
    useTelegramLinkStore.getState().linkByPayload(code.code, USER);

    const second = useTelegramLinkStore
      .getState()
      .issueLinkCode({ userId: 'u-7', asociatieId: 'asoc-7', role: 'proprietar' });
    const out = useTelegramLinkStore.getState().linkByPayload(second.code, USER);

    expect(out.status).toBe('already-linked');
    // The second code is left unconsumed.
    const fresh = useTelegramLinkStore.getState().linkCodes.find((c) => c.id === second.id);
    expect(fresh?.consumedAt).toBeNull();
  });

  it('validates an invite code but does not record it offline (persisted live, T58)', () => {
    const invite = useInviteStore.getState().issue({ asociatieId: 'asoc-9', role: 'comitet' });

    const out = useTelegramLinkStore.getState().linkByPayload(invite.code, USER);

    expect(out.status).toBe('linked');
    expect(out.inviteId).toBe(invite.id);
    expect(out.link?.userId).toBeNull();
    expect(out.link?.asociatieId).toBe('asoc-9');
    // Nothing recorded offline, and the invite is not spent.
    expect(useTelegramLinkStore.getState().links).toHaveLength(0);
    expect(useInviteStore.getState().invites[0].consumedAt).toBeNull();
  });

  it('reports unknown for an unrecognised payload', () => {
    const out = useTelegramLinkStore.getState().linkByPayload('NOPE2345', USER);
    expect(out.status).toBe('unknown');
  });

  it('unlink removes an established link', () => {
    const code = useTelegramLinkStore
      .getState()
      .issueLinkCode({ userId: 'u-7', asociatieId: 'asoc-7', role: 'proprietar' });
    useTelegramLinkStore.getState().linkByPayload(code.code, USER);
    expect(useTelegramLinkStore.getState().linkFor(777)).not.toBeNull();

    useTelegramLinkStore.getState().unlink(777);
    expect(useTelegramLinkStore.getState().linkFor(777)).toBeNull();
  });
});
