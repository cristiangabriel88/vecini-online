import { describe, expect, it } from 'vitest';
import {
  DELIVERED_OTP_CHANNELS,
  OTP_LENGTH,
  OTP_RESEND_COOLDOWN_MS,
  OTP_TTL_MS,
  generateConfirmToken,
  generateNumericOtp,
  generateOtpSalt,
  hashConfirmToken,
  hashOtp,
  isDeliveredChannel,
  isValidOtpFormat,
  maskEmail,
  maskTelegram,
  normalizeOtp,
  otpChallengeExpired,
  otpExpiresAt,
  resendCooldownRemainingMs,
  timingSafeEqualHex,
  verifyOtpHash,
} from '@/features/auth/otpChannelLogic';

describe('channel taxonomy', () => {
  it('treats only email and telegram as delivered channels', () => {
    expect(DELIVERED_OTP_CHANNELS).toEqual(['email', 'telegram']);
    expect(isDeliveredChannel('email')).toBe(true);
    expect(isDeliveredChannel('telegram')).toBe(true);
    expect(isDeliveredChannel('totp')).toBe(false);
  });
});

describe('generateNumericOtp', () => {
  it('produces a code of the requested length, digits only', () => {
    const code = generateNumericOtp();
    expect(code).toHaveLength(OTP_LENGTH);
    expect(code).toMatch(/^\d{6}$/);
    expect(generateNumericOtp(8)).toMatch(/^\d{8}$/);
  });

  it('covers all ten digits without bias over many draws', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 400; i++) for (const ch of generateNumericOtp()) seen.add(ch);
    expect(seen.size).toBe(10); // 0..9 all appear; rejection sampling stays uniform.
  });

  it('is effectively unique per call', () => {
    const a = generateNumericOtp();
    const codes = new Set([a]);
    for (let i = 0; i < 50; i++) codes.add(generateNumericOtp());
    expect(codes.size).toBeGreaterThan(1);
  });
});

describe('isValidOtpFormat / normalizeOtp', () => {
  it('accepts exactly six digits, tolerates spacing, rejects others', () => {
    expect(isValidOtpFormat('123456')).toBe(true);
    expect(isValidOtpFormat(' 123 456 ')).toBe(true);
    expect(isValidOtpFormat('12345')).toBe(false);
    expect(isValidOtpFormat('1234567')).toBe(false);
    expect(isValidOtpFormat('12a456')).toBe(false);
  });

  it('normalises spacing to digits only', () => {
    expect(normalizeOtp(' 12 34 56 ')).toBe('123456');
  });
});

describe('hashOtp + verifyOtpHash', () => {
  it('is deterministic for the same code and salt and tolerates spacing', async () => {
    const salt = generateOtpSalt();
    const h = await hashOtp('123456', salt);
    expect(await hashOtp(' 123 456 ', salt)).toBe(h);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it('changes with the salt so identical codes do not share a hash', async () => {
    expect(await hashOtp('123456', generateOtpSalt())).not.toBe(
      await hashOtp('123456', generateOtpSalt()),
    );
  });

  it('verifies the right code and rejects the wrong/malformed one', async () => {
    const salt = generateOtpSalt();
    const stored = await hashOtp('123456', salt);
    expect(await verifyOtpHash(stored, salt, '123456')).toBe(true);
    expect(await verifyOtpHash(stored, salt, '000000')).toBe(false);
    expect(await verifyOtpHash(stored, salt, 'abcdef')).toBe(false);
    expect(await verifyOtpHash(stored, salt, '12345')).toBe(false);
  });
});

describe('timingSafeEqualHex', () => {
  it('compares equal strings true and unequal/length-mismatched false', () => {
    expect(timingSafeEqualHex('abcd', 'abcd')).toBe(true);
    expect(timingSafeEqualHex('abcd', 'abce')).toBe(false);
    expect(timingSafeEqualHex('abcd', 'abc')).toBe(false);
  });
});

describe('confirm token', () => {
  it('mints a url-safe token and hashes it deterministically', async () => {
    const token = generateConfirmToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(token).not.toContain('=');
    expect(generateConfirmToken()).not.toBe(token);
    const h = await hashConfirmToken(token);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(await hashConfirmToken(token)).toBe(h);
  });
});

describe('expiry + resend clocks', () => {
  it('computes expiry and detects a lapsed code', () => {
    const created = 1_700_000_000_000;
    const expires = otpExpiresAt(created);
    expect(expires).toBe(created + OTP_TTL_MS);
    expect(otpChallengeExpired(expires, created)).toBe(false);
    expect(otpChallengeExpired(expires, created + OTP_TTL_MS - 1)).toBe(false);
    expect(otpChallengeExpired(expires, created + OTP_TTL_MS)).toBe(true);
  });

  it('counts down the resend cooldown to zero', () => {
    const sent = 1_700_000_000_000;
    expect(resendCooldownRemainingMs(sent, sent)).toBe(OTP_RESEND_COOLDOWN_MS);
    expect(resendCooldownRemainingMs(sent, sent + OTP_RESEND_COOLDOWN_MS)).toBe(0);
    expect(resendCooldownRemainingMs(sent, sent + OTP_RESEND_COOLDOWN_MS + 5_000)).toBe(0);
  });
});

describe('masking', () => {
  it('masks an email keeping at most two local characters', () => {
    expect(maskEmail('ana.popescu@gmail.com')).toBe('an***@gmail.com');
    expect(maskEmail('a@bloc.ro')).toBe('a***@bloc.ro');
    expect(maskEmail('not-an-email')).toBe('***');
  });

  it('masks a telegram handle to a short hint', () => {
    expect(maskTelegram('@anapop')).toBe('@a***');
    expect(maskTelegram('anapop')).toBe('@a***');
    expect(maskTelegram('')).toBe('Telegram');
  });
});
