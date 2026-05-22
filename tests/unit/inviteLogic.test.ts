import { describe, expect, it } from 'vitest';
import {
  type InviteCode,
  EXPIRY_PRESETS_MS,
  INVITABLE_ROLES,
  buildMembershipFromInvite,
  consumeInvite,
  createInvite,
  expiryFromPreset,
  findByCode,
  isRedeemable,
  revokeInvite,
  validateInvite,
} from '@/features/invites/inviteLogic';

const NOW = 1_700_000_000_000;

function make(overrides: Partial<InviteCode> = {}): InviteCode {
  return {
    id: 'inv-1',
    asociatieId: 'asoc-1',
    code: 'ABCD2345',
    role: 'proprietar',
    apartmentId: null,
    expiresAt: null,
    singleUse: true,
    consumedAt: null,
    consumedByUserId: null,
    revokedAt: null,
    createdAt: NOW,
    createdBy: null,
    ...overrides,
  };
}

describe('createInvite', () => {
  it('mints a code tied to the asociație with sensible defaults', () => {
    const invite = createInvite({ asociatieId: 'asoc-7' }, [], NOW);
    expect(invite.asociatieId).toBe('asoc-7');
    expect(invite.role).toBe('proprietar');
    expect(invite.apartmentId).toBeNull();
    expect(invite.expiresAt).toBeNull();
    expect(invite.singleUse).toBe(true);
    expect(invite.consumedAt).toBeNull();
    expect(invite.revokedAt).toBeNull();
    expect(invite.createdAt).toBe(NOW);
    expect(invite.code).toMatch(/^[A-Z2-9]{8}$/);
  });

  it('carries the supplied role, apartment, expiry, single-use flag and creator', () => {
    const invite = createInvite(
      {
        asociatieId: 'asoc-1',
        role: 'comitet',
        apartmentId: 'ap-3',
        expiresAt: NOW + 1000,
        singleUse: false,
        createdBy: 'u-admin',
      },
      [],
      NOW,
    );
    expect(invite.role).toBe('comitet');
    expect(invite.apartmentId).toBe('ap-3');
    expect(invite.expiresAt).toBe(NOW + 1000);
    expect(invite.singleUse).toBe(false);
    expect(invite.createdBy).toBe('u-admin');
  });

  it('regenerates on collision so codes stay unique within the store', () => {
    // RNG forces the first generated code to collide with an existing one, then
    // yields a different code on the next attempt.
    const sequence = [0, 0, 0, 0, 0, 0, 0, 0, 5, 5, 5, 5, 5, 5, 5, 5];
    let i = 0;
    const rng = () => sequence[i++] / 32;
    const first = createInvite({ asociatieId: 'a' }, [], NOW, rng);
    i = 0; // replay the same first code so it is "taken"
    const second = createInvite({ asociatieId: 'a' }, [first.code], NOW, rng);
    expect(second.code).not.toBe(first.code);
  });
});

describe('validateInvite', () => {
  it('returns unknown for a missing code', () => {
    expect(validateInvite(undefined, NOW)).toBe('unknown');
  });

  it('returns ok for a fresh, unexpired, unconsumed code', () => {
    expect(validateInvite(make({ expiresAt: NOW + 1000 }), NOW)).toBe('ok');
    expect(validateInvite(make({ expiresAt: null }), NOW)).toBe('ok');
  });

  it('returns expired once past the expiry instant', () => {
    expect(validateInvite(make({ expiresAt: NOW }), NOW)).toBe('expired');
    expect(validateInvite(make({ expiresAt: NOW - 1 }), NOW)).toBe('expired');
  });

  it('returns used for a consumed single-use code, even past expiry', () => {
    expect(validateInvite(make({ consumedAt: NOW - 1, expiresAt: NOW - 5 }), NOW)).toBe('used');
  });

  it('lets a reusable code stay ok after a consumption', () => {
    expect(
      validateInvite(make({ singleUse: false, consumedAt: NOW - 1, expiresAt: NOW + 1000 }), NOW),
    ).toBe('ok');
  });

  it('returns revoked regardless of expiry or consumption', () => {
    expect(validateInvite(make({ revokedAt: NOW - 1, expiresAt: NOW + 1000 }), NOW)).toBe('revoked');
  });
});

describe('isRedeemable', () => {
  it('mirrors validateInvite === ok', () => {
    expect(isRedeemable(make({ expiresAt: NOW + 1 }), NOW)).toBe(true);
    expect(isRedeemable(make({ revokedAt: NOW }), NOW)).toBe(false);
    expect(isRedeemable(undefined, NOW)).toBe(false);
  });
});

describe('consumeInvite / revokeInvite', () => {
  it('marks a code consumed by a user without mutating the original', () => {
    const original = make();
    const consumed = consumeInvite(original, 'u-joiner', NOW);
    expect(consumed.consumedAt).toBe(NOW);
    expect(consumed.consumedByUserId).toBe('u-joiner');
    expect(original.consumedAt).toBeNull();
    expect(validateInvite(consumed, NOW)).toBe('used');
  });

  it('marks a code revoked without mutating the original', () => {
    const original = make();
    const revoked = revokeInvite(original, NOW);
    expect(revoked.revokedAt).toBe(NOW);
    expect(original.revokedAt).toBeNull();
    expect(validateInvite(revoked, NOW)).toBe('revoked');
  });
});

describe('findByCode', () => {
  const invites = [make({ id: 'inv-1', code: 'ABCD2345' }), make({ id: 'inv-2', code: 'WXYZ6789' })];

  it('finds a code, normalising whitespace, case and separators', () => {
    expect(findByCode(invites, ' wxyz-6789 ')?.id).toBe('inv-2');
  });

  it('returns undefined for a blank or unmatched code', () => {
    expect(findByCode(invites, '')).toBeUndefined();
    expect(findByCode(invites, 'NOPE2345')).toBeUndefined();
  });
});

describe('expiryFromPreset', () => {
  it('resolves presets to absolute instants and never to null', () => {
    expect(expiryFromPreset('never', NOW)).toBeNull();
    expect(expiryFromPreset('7d', NOW)).toBe(NOW + EXPIRY_PRESETS_MS['7d']);
    expect(expiryFromPreset('30d', NOW)).toBe(NOW + EXPIRY_PRESETS_MS['30d']);
  });
});

describe('INVITABLE_ROLES', () => {
  it('never offers the founder/platform roles', () => {
    expect(INVITABLE_ROLES).not.toContain('admin');
    expect(INVITABLE_ROLES).not.toContain('super_admin');
    expect(INVITABLE_ROLES).toContain('proprietar');
  });
});

describe('buildMembershipFromInvite', () => {
  it('grants the joiner the code role in the code asociație, active and non-founder', () => {
    const invite = make({ asociatieId: 'asoc-9', role: 'comitet', apartmentId: 'ap-2' });
    const membership = buildMembershipFromInvite('u-joiner', invite, '2026-05-23T10:00:00.000Z');
    expect(membership.user_id).toBe('u-joiner');
    expect(membership.asociatie_id).toBe('asoc-9');
    expect(membership.role).toBe('comitet');
    expect(membership.ended_at).toBeNull();
    expect(membership.joined_at).toBe('2026-05-23T10:00:00.000Z');
    // The joiner is never the founder/platform admin (only invitable roles ship).
    expect(membership.title).toBeNull();
    expect(membership.role).not.toBe('admin');
  });

  it('mints a unique membership id per call', () => {
    const invite = make();
    const a = buildMembershipFromInvite('u', invite);
    const b = buildMembershipFromInvite('u', invite);
    expect(a.id).not.toBe(b.id);
  });
});
