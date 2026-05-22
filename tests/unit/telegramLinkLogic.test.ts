import { describe, expect, it } from 'vitest';
import {
  type TelegramLinkCode,
  type TelegramUserInfo,
  createLinkCode,
  consumeLinkCode,
  findLinkByCode,
  validateLinkCode,
  buildLinkFromInvite,
  resolveTelegramStart,
} from '@/features/telegram/telegramLinkLogic';
import { createInvite } from '@/features/invites/inviteLogic';

const USER: TelegramUserInfo = {
  telegramUserId: 555,
  username: 'ana',
  firstName: 'Ana',
};

const NOW = 1_700_000_000_000;

function linkCode(over: Partial<TelegramLinkCode> = {}): TelegramLinkCode {
  return {
    id: 'tlc-1',
    code: 'AB23CD45',
    userId: 'u-1',
    asociatieId: 'asoc-1',
    role: 'proprietar',
    expiresAt: null,
    consumedAt: null,
    consumedByTelegramId: null,
    createdAt: NOW,
    ...over,
  };
}

describe('createLinkCode', () => {
  it('mints a unique code, regenerating on collision', () => {
    let call = 0;
    // The first 8 rng draws yield 'AAAAAAAA' (collides with the existing code);
    // the next 8 yield 'SSSSSSSS' (index 16 in the unambiguous alphabet).
    const rng = () => {
      call++;
      return call <= 8 ? 0 : 0.5;
    };
    const made = createLinkCode(
      { userId: 'u-1', asociatieId: 'asoc-1', role: 'comitet' },
      ['AAAAAAAA'],
      NOW,
      rng,
    );
    expect(made.code).toBe('SSSSSSSS');
    expect(made.userId).toBe('u-1');
    expect(made.role).toBe('comitet');
    expect(made.consumedAt).toBeNull();
  });

  it('defaults to never-expiring and single-use', () => {
    const made = createLinkCode({ userId: 'u-2', asociatieId: 'asoc-2', role: 'chirias' }, [], NOW);
    expect(made.expiresAt).toBeNull();
    expect(made.consumedByTelegramId).toBeNull();
  });
});

describe('validateLinkCode', () => {
  it('returns unknown for a missing code', () => {
    expect(validateLinkCode(undefined, NOW)).toBe('unknown');
  });
  it('returns ok for a fresh code', () => {
    expect(validateLinkCode(linkCode(), NOW)).toBe('ok');
  });
  it('returns used once consumed', () => {
    expect(validateLinkCode(linkCode({ consumedAt: NOW - 1 }), NOW)).toBe('used');
  });
  it('returns expired past its expiry', () => {
    expect(validateLinkCode(linkCode({ expiresAt: NOW - 1 }), NOW)).toBe('expired');
  });
});

describe('findLinkByCode / consumeLinkCode', () => {
  it('finds a code normalising whitespace, case and separators', () => {
    const found = findLinkByCode([linkCode()], ' ab23-cd45 ');
    expect(found?.id).toBe('tlc-1');
  });
  it('consume marks the code used by the telegram user without mutating the original', () => {
    const original = linkCode();
    const consumed = consumeLinkCode(original, 555, NOW);
    expect(consumed.consumedAt).toBe(NOW);
    expect(consumed.consumedByTelegramId).toBe(555);
    expect(original.consumedAt).toBeNull();
  });
});

describe('resolveTelegramStart', () => {
  it('asks for a code when there is no payload', () => {
    const out = resolveTelegramStart({ payload: null, telegramUser: USER, now: NOW });
    expect(out.status).toBe('no-code');
    expect(out.link).toBeNull();
  });

  it('reports already-linked when the telegram user has an established link', () => {
    const existingLink = buildLinkFromInvite(
      createInvite({ asociatieId: 'asoc-x' }, [], NOW),
      USER,
      NOW,
    );
    const out = resolveTelegramStart({
      payload: 'WHATEVER1',
      telegramUser: USER,
      existingLink,
      now: NOW,
    });
    expect(out.status).toBe('already-linked');
    expect(out.link).toBe(existingLink);
  });

  it('links via a per-user link code to a concrete user + asociație', () => {
    const code = linkCode({ userId: 'u-99', asociatieId: 'asoc-99', role: 'comitet' });
    const out = resolveTelegramStart({
      payload: 'ab23cd45',
      telegramUser: USER,
      linkCodes: [code],
      now: NOW,
    });
    expect(out.status).toBe('linked');
    expect(out.linkCodeId).toBe('tlc-1');
    expect(out.inviteId).toBeNull();
    expect(out.link).toMatchObject({
      telegramUserId: 555,
      userId: 'u-99',
      asociatieId: 'asoc-99',
      role: 'comitet',
      source: 'link-code',
    });
  });

  it('propagates a non-ok link-code status without falling through to invites', () => {
    const expired = linkCode({ expiresAt: NOW - 1 });
    const out = resolveTelegramStart({
      payload: 'AB23CD45',
      telegramUser: USER,
      linkCodes: [expired],
      inviteCodes: [],
      now: NOW,
    });
    expect(out.status).toBe('expired');
    expect(out.link).toBeNull();
  });

  it('links via an invite code, deferring the app user to the live path (null userId)', () => {
    const invite = createInvite(
      { asociatieId: 'asoc-7', role: 'proprietar', apartmentId: 'ap-7' },
      [],
      NOW,
    );
    const out = resolveTelegramStart({
      payload: invite.code,
      telegramUser: USER,
      inviteCodes: [invite],
      now: NOW,
    });
    expect(out.status).toBe('linked');
    expect(out.inviteId).toBe(invite.id);
    expect(out.linkCodeId).toBeNull();
    expect(out.link).toMatchObject({
      userId: null,
      asociatieId: 'asoc-7',
      role: 'proprietar',
      apartmentId: 'ap-7',
      source: 'invite',
    });
  });

  it('reports the invite status for a non-ok invite code', () => {
    const invite = createInvite({ asociatieId: 'asoc-8', expiresAt: NOW - 1 }, [], NOW - 10);
    const out = resolveTelegramStart({
      payload: invite.code,
      telegramUser: USER,
      inviteCodes: [invite],
      now: NOW,
    });
    expect(out.status).toBe('expired');
    expect(out.link).toBeNull();
  });

  it('reports unknown when the payload matches nothing', () => {
    const out = resolveTelegramStart({
      payload: 'NOPE2345',
      telegramUser: USER,
      linkCodes: [],
      inviteCodes: [],
      now: NOW,
    });
    expect(out.status).toBe('unknown');
    expect(out.link).toBeNull();
  });
});
