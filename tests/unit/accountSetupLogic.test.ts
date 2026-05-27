import { describe, expect, it } from 'vitest';
import {
  type SetupProvisionLike,
  NAME_MAX_LENGTH,
  evaluateAccountForm,
  isValidName,
  postSetupRoute,
  resolveOnboarding,
  setupProvisionStatus,
} from '@/features/onboarding/accountSetupLogic';
import { createInvite, revokeInvite } from '@/features/invites/inviteLogic';

/**
 * Pure coverage for the account-creation-on-redemption landing (T124): resolving
 * an onboarding token/code to a locatar-invite or admin-setup descriptor, the
 * setup-provision validity check, and the account-form submit gate.
 */
const NOW = 1_700_000_000_000;

function setup(over: Partial<SetupProvisionLike> = {}): SetupProvisionLike {
  return {
    asociatieId: 'platform-asoc-1',
    asociatieName: 'Asociația Bloc 7',
    setupToken: 'a'.repeat(64),
    setupCode: 'SETUP234',
    expiresAt: NOW + 60_000,
    redeemedAt: null,
    ...over,
  };
}

describe('setupProvisionStatus', () => {
  it('is ok for a fresh, unexpired provision', () => {
    expect(setupProvisionStatus(setup(), NOW)).toBe('ok');
  });
  it('is unknown for a missing record', () => {
    expect(setupProvisionStatus(undefined, NOW)).toBe('unknown');
  });
  it('reads used once redeemed, even past expiry', () => {
    expect(setupProvisionStatus(setup({ redeemedAt: NOW, expiresAt: NOW - 1 }), NOW)).toBe('used');
  });
  it('reads expired past the window', () => {
    expect(setupProvisionStatus(setup({ expiresAt: NOW - 1 }), NOW)).toBe('expired');
  });
});

describe('resolveOnboarding', () => {
  it('resolves a locatar invite by its token, carrying the granted role', () => {
    const invite = createInvite({ asociatieId: 'asoc-9', role: 'chirias' }, [], NOW);
    const resolved = resolveOnboarding(invite.token, [invite], [], NOW);
    expect(resolved).toMatchObject({
      kind: 'invite',
      status: 'ok',
      asociatieId: 'asoc-9',
      asociatieName: null,
      role: 'chirias',
    });
  });

  it('resolves a locatar invite by its short code as the manual fallback', () => {
    const invite = createInvite({ asociatieId: 'asoc-9', role: 'proprietar' }, [], NOW);
    const resolved = resolveOnboarding(invite.code.toLowerCase(), [invite], [], NOW);
    expect(resolved?.kind).toBe('invite');
    expect(resolved?.role).toBe('proprietar');
  });

  it('reports the invite status (revoked) without claiming a setup match', () => {
    const invite = revokeInvite(createInvite({ asociatieId: 'asoc-9' }, [], NOW), NOW);
    const resolved = resolveOnboarding(invite.token, [invite], [], NOW);
    expect(resolved).toMatchObject({ kind: 'invite', status: 'revoked' });
  });

  it('resolves an admin setup link by token to an admin-role descriptor with the asociație name', () => {
    const resolved = resolveOnboarding('a'.repeat(64), [], [setup()], NOW);
    expect(resolved).toMatchObject({
      kind: 'setup',
      status: 'ok',
      asociatieId: 'platform-asoc-1',
      asociatieName: 'Asociația Bloc 7',
      role: 'admin',
    });
  });

  it('resolves an admin setup link by its fallback code', () => {
    const resolved = resolveOnboarding('setup234', [], [setup()], NOW);
    expect(resolved?.kind).toBe('setup');
  });

  it('prefers a locatar invite when both somehow match (invites checked first)', () => {
    const invite = createInvite({ asociatieId: 'asoc-9' }, [], NOW);
    const resolved = resolveOnboarding(invite.token, [invite], [setup({ setupToken: invite.token })], NOW);
    expect(resolved?.kind).toBe('invite');
  });

  it('returns null when nothing matches', () => {
    expect(resolveOnboarding('f'.repeat(64), [], [setup()], NOW)).toBeNull();
  });
});

describe('postSetupRoute', () => {
  it('returns /onboarding for a setup token so the admin configures their asociatie', () => {
    expect(postSetupRoute('setup')).toBe('/onboarding');
  });

  it('returns /app for an invite token so the resident lands directly in the app', () => {
    expect(postSetupRoute('invite')).toBe('/app');
  });
});

describe('evaluateAccountForm', () => {
  const strong = 'Munte-Albastru-91';
  const name = 'Ioana Popescu';

  it('accepts a valid name + email with a strong, matching password', () => {
    const r = evaluateAccountForm({ name, email: 'vecin@example.com', password: strong, confirm: strong });
    expect(r.ok).toBe(true);
    expect(r.nameInvalid).toBe(false);
    expect(r.emailInvalid).toBe(false);
    expect(r.mismatch).toBe(false);
  });

  it('blocks on a malformed email', () => {
    const r = evaluateAccountForm({ name, email: 'not-an-email', password: strong, confirm: strong });
    expect(r.ok).toBe(false);
    expect(r.emailInvalid).toBe(true);
  });

  it('blocks on a breached password and surfaces the policy issue', () => {
    const r = evaluateAccountForm({ name, email: 'vecin@example.com', password: 'password123', confirm: 'password123' });
    expect(r.ok).toBe(false);
    expect(r.assessment.issues).toContain('breached');
  });

  it('blocks and flags a mismatched confirmation', () => {
    const r = evaluateAccountForm({ name, email: 'vecin@example.com', password: strong, confirm: `${strong}x` });
    expect(r.ok).toBe(false);
    expect(r.mismatch).toBe(true);
  });

  it('is not ok until the confirmation is filled', () => {
    const r = evaluateAccountForm({ name, email: 'vecin@example.com', password: strong, confirm: '' });
    expect(r.ok).toBe(false);
    expect(r.mismatch).toBe(false);
  });

  it('blocks on an empty name without flagging an inline error', () => {
    const r = evaluateAccountForm({ name: '   ', email: 'vecin@example.com', password: strong, confirm: strong });
    expect(r.ok).toBe(false);
    expect(r.nameInvalid).toBe(false);
  });

  it('flags a too-short name inline', () => {
    const r = evaluateAccountForm({ name: 'A', email: 'vecin@example.com', password: strong, confirm: strong });
    expect(r.ok).toBe(false);
    expect(r.nameInvalid).toBe(true);
  });

  it('accepts a Romanian name with diacritics and a hyphen', () => {
    const r = evaluateAccountForm({
      name: 'Ștefan-Andrei Mureșan',
      email: 'vecin@example.com',
      password: strong,
      confirm: strong,
    });
    expect(r.ok).toBe(true);
    expect(r.nameInvalid).toBe(false);
  });
});

describe('isValidName', () => {
  it('accepts a name within the length bounds', () => {
    expect(isValidName('Ana')).toBe(true);
  });
  it('rejects a blank or whitespace-only name', () => {
    expect(isValidName('   ')).toBe(false);
  });
  it('rejects a single character', () => {
    expect(isValidName('A')).toBe(false);
  });
  it('rejects a name past the maximum length', () => {
    expect(isValidName('x'.repeat(NAME_MAX_LENGTH + 1))).toBe(false);
  });
});
