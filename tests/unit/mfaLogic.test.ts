// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  anyRoleRequiresMfa,
  base32Decode,
  base32Encode,
  buildOtpAuthUri,
  challengeNeeded,
  consumeRecoveryCode,
  generateRecoveryCodes,
  generateTotpSecret,
  hashRecoveryCode,
  hotp,
  isValidTotpFormat,
  mfaEnforcementRedirect,
  mfaErrorKey,
  normalizeRecoveryCode,
  requiresMfa,
  totp,
  verifyTotp,
} from '@/features/auth/mfaLogic';

// RFC 4226 / 6238 reference secret: ASCII "12345678901234567890" in base32.
const RFC_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

describe('base32 codec', () => {
  it('round-trips arbitrary bytes', () => {
    const bytes = new Uint8Array([0, 1, 2, 250, 128, 255, 64]);
    expect(Array.from(base32Decode(base32Encode(bytes)))).toEqual(Array.from(bytes));
  });

  it('decodes the RFC secret to the ASCII digits 1..0', () => {
    expect(new TextDecoder().decode(base32Decode(RFC_SECRET))).toBe('12345678901234567890');
  });
});

describe('HOTP (RFC 4226 vectors)', () => {
  it('matches the published 6-digit vectors', async () => {
    expect(await hotp(RFC_SECRET, 0)).toBe('755224');
    expect(await hotp(RFC_SECRET, 1)).toBe('287082');
    expect(await hotp(RFC_SECRET, 2)).toBe('359152');
  });
});

describe('TOTP (RFC 6238)', () => {
  it('matches the 8-digit SHA-1 vector at T=59', async () => {
    expect(await totp(RFC_SECRET, 59_000, 8)).toBe('94287082');
  });

  it('verifies the code generated for the current instant', async () => {
    const at = 1_700_000_000_000;
    const code = await totp(RFC_SECRET, at);
    expect(await verifyTotp(RFC_SECRET, code, { atMs: at })).toBe(true);
  });

  it('accepts a code from the adjacent step within the drift window', async () => {
    const at = 1_700_000_000_000;
    const prev = await totp(RFC_SECRET, at - 30_000);
    expect(await verifyTotp(RFC_SECRET, prev, { atMs: at, window: 1 })).toBe(true);
    expect(await verifyTotp(RFC_SECRET, prev, { atMs: at, window: 0 })).toBe(false);
  });

  it('rejects a wrong or malformed code', async () => {
    const at = 1_700_000_000_000;
    expect(await verifyTotp(RFC_SECRET, '000000', { atMs: at })).toBe(false);
    expect(await verifyTotp(RFC_SECRET, 'abcdef', { atMs: at })).toBe(false);
  });
});

describe('generateTotpSecret', () => {
  it('produces a non-trivial base32 secret', () => {
    const s = generateTotpSecret();
    expect(s.length).toBeGreaterThanOrEqual(32);
    expect(s).toMatch(/^[A-Z2-7]+$/);
    expect(generateTotpSecret()).not.toBe(s);
  });
});

describe('isValidTotpFormat', () => {
  it('accepts exactly six digits, trims, rejects others', () => {
    expect(isValidTotpFormat('123456')).toBe(true);
    expect(isValidTotpFormat('  123456 ')).toBe(true);
    expect(isValidTotpFormat('12345')).toBe(false);
    expect(isValidTotpFormat('1234567')).toBe(false);
    expect(isValidTotpFormat('12a456')).toBe(false);
  });
});

describe('buildOtpAuthUri', () => {
  it('embeds the secret, issuer and SHA1/6/30 parameters', () => {
    const uri = buildOtpAuthUri({ secret: RFC_SECRET, account: 'ana@bloc.ro', issuer: 'vecini.online' });
    expect(uri.startsWith('otpauth://totp/')).toBe(true);
    expect(uri).toContain(`secret=${RFC_SECRET}`);
    expect(uri).toContain('algorithm=SHA1');
    expect(uri).toContain('digits=6');
    expect(uri).toContain('period=30');
    expect(uri).toContain('vecini.online%3Aana%40bloc.ro');
  });
});

describe('recovery codes', () => {
  it('generates the right count of formatted, unique codes', () => {
    const codes = generateRecoveryCodes();
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
    for (const c of codes) expect(c).toMatch(/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
  });

  it('normalises spacing and case before comparison', () => {
    expect(normalizeRecoveryCode(' ab12-cd34 ')).toBe('AB12CD34');
  });

  it('consumes a matching code once and rejects re-use', async () => {
    const codes = generateRecoveryCodes(3);
    const hashes = await Promise.all(codes.map(hashRecoveryCode));

    // A lower-cased, undashed form of a real code still matches.
    const first = await consumeRecoveryCode(hashes, codes[0].replace('-', '').toLowerCase());
    expect(first.matched).toBe(true);
    expect(first.remaining).toHaveLength(2);

    // The same code cannot be used a second time.
    const second = await consumeRecoveryCode(first.remaining, codes[0]);
    expect(second.matched).toBe(false);
    expect(second.remaining).toHaveLength(2);
  });

  it('rejects an unknown code without altering the set', async () => {
    const hashes = await Promise.all(generateRecoveryCodes(2).map(hashRecoveryCode));
    const r = await consumeRecoveryCode(hashes, 'ZZZZ-ZZZZ');
    expect(r.matched).toBe(false);
    expect(r.remaining).toBe(hashes);
  });
});

describe('role enforcement', () => {
  it('requires 2FA for privileged roles only', () => {
    for (const role of ['super_admin', 'admin', 'presedinte', 'comitet', 'cenzor'] as const) {
      expect(requiresMfa(role)).toBe(true);
    }
    expect(requiresMfa('proprietar')).toBe(false);
    expect(requiresMfa('chirias')).toBe(false);
    expect(requiresMfa(null)).toBe(false);
    expect(requiresMfa(undefined)).toBe(false);
  });

  it('flags a membership set that contains any privileged role', () => {
    expect(anyRoleRequiresMfa(['proprietar', 'comitet'])).toBe(true);
    expect(anyRoleRequiresMfa(['proprietar', 'chirias'])).toBe(false);
    expect(anyRoleRequiresMfa([])).toBe(false);
  });
});

describe('challengeNeeded', () => {
  it('is true only when stepping from aal1 up to aal2', () => {
    expect(challengeNeeded('aal1', 'aal2')).toBe(true);
    expect(challengeNeeded('aal1', 'aal1')).toBe(false);
    expect(challengeNeeded('aal2', 'aal2')).toBe(false);
    expect(challengeNeeded(null, null)).toBe(false);
  });
});

describe('mfaErrorKey', () => {
  it('maps internal codes and Supabase messages to stable keys', () => {
    expect(mfaErrorKey('invalid-code')).toBe('invalidCode');
    expect(mfaErrorKey('Invalid TOTP code entered')).toBe('invalidCode');
    expect(mfaErrorKey('recovery-live-unavailable')).toBe('recoveryLiveUnavailable');
    expect(mfaErrorKey('not-enrolled')).toBe('notEnrolled');
    expect(mfaErrorKey('boom')).toBe('generic');
    expect(mfaErrorKey(null)).toBe('generic');
  });

  it('maps the delivered-channel error codes', () => {
    expect(mfaErrorKey('expired-code')).toBe('expiredCode');
    expect(mfaErrorKey('no-channel')).toBe('noChannel');
    expect(mfaErrorKey('delivery-failed')).toBe('deliveryFailed');
    expect(mfaErrorKey('channel-locked')).toBe('channelLocked');
  });
});

describe('mfaEnforcementRedirect — app-defined second factor (email/Telegram)', () => {
  const base = {
    supabaseConfigured: true,
    loaded: true,
    role: 'admin' as const,
    enrolled: true,
    pathname: '/app/anunturi',
  };

  it('lets an enrolled session through once an app channel is satisfied even at AAL1', () => {
    expect(mfaEnforcementRedirect({ ...base, aalSatisfied: false, app2faSatisfied: true })).toBeNull();
  });

  it('still re-gates an enrolled session that passed neither native AAL2 nor an app channel', () => {
    expect(mfaEnforcementRedirect({ ...base, aalSatisfied: false, app2faSatisfied: false })).toBe(
      '/app/securitate',
    );
    expect(mfaEnforcementRedirect({ ...base, aalSatisfied: false })).toBe('/app/securitate');
  });

  it('never steers on an unresolved app-channel status (axis stays opt-in)', () => {
    expect(mfaEnforcementRedirect({ ...base, aalSatisfied: true, app2faSatisfied: undefined })).toBeNull();
    expect(mfaEnforcementRedirect({ ...base })).toBeNull();
  });
});
