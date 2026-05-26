/**
 * Unit tests for the demo OTP channel actions in `mfaStore` (T140).
 *
 * The demo path mints and verifies real cryptographic hashes offline, so these
 * tests exercise genuine OTP generation and salted-SHA-256 verification without
 * any network or Supabase dependency. The time-sensitive paths (expiry, resend
 * cooldown) are driven via the explicit `now` parameter so assertions are
 * deterministic regardless of wall-clock speed.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { useMfaStore } from '@/shared/store/mfaStore';
import { MAX_FAILURES } from '@/features/auth/loginThrottle';
import { OTP_RESEND_COOLDOWN_MS, OTP_TTL_MS } from '@/features/auth/otpChannelLogic';

const EPOCH = 1_700_000_000_000;

function resetChannelState() {
  useMfaStore.setState({
    demoEnabledChannels: {},
    demoOtpChallenges: {},
    demoResendAt: {},
    otpThrottles: {},
    pendingDemoRole: null,
  });
}

beforeEach(resetChannelState);

describe('enableChannel / disableChannel', () => {
  it('enables an email channel and stores the hint', () => {
    useMfaStore.getState().enableChannel('email', 'an***@gmail.com');
    const ch = useMfaStore.getState().demoEnabledChannels['email'];
    expect(ch).toBeDefined();
    expect(ch?.targetHint).toBe('an***@gmail.com');
  });

  it('enables a telegram channel', () => {
    useMfaStore.getState().enableChannel('telegram', '@a***');
    const ch = useMfaStore.getState().demoEnabledChannels['telegram'];
    expect(ch?.targetHint).toBe('@a***');
  });

  it('ignores totp (totp is not a delivered channel)', () => {
    useMfaStore.getState().enableChannel('totp', 'hint');
    expect(useMfaStore.getState().demoEnabledChannels['totp']).toBeUndefined();
  });

  it('disables a channel and clears its pending challenge', async () => {
    useMfaStore.getState().enableChannel('email', 'an***@gmail.com');
    // Mint a challenge.
    await useMfaStore.getState().requestOtp('email', EPOCH);
    expect(useMfaStore.getState().demoOtpChallenges['email']).toBeDefined();
    // Disable removes both.
    useMfaStore.getState().disableChannel('email');
    expect(useMfaStore.getState().demoEnabledChannels['email']).toBeUndefined();
    expect(useMfaStore.getState().demoOtpChallenges['email']).toBeUndefined();
  });
});

describe('enabledChannels', () => {
  it('returns empty when nothing is enabled', () => {
    expect(useMfaStore.getState().enabledChannels()).toEqual([]);
  });

  it('includes totp when the demo TOTP secret is set', () => {
    useMfaStore.setState({ demoSecret: 'JBSWY3DPEHPK3PXP' });
    expect(useMfaStore.getState().enabledChannels()).toContain('totp');
    useMfaStore.setState({ demoSecret: null });
  });

  it('lists enabled delivered channels in order: email before telegram', () => {
    useMfaStore.getState().enableChannel('telegram', '@a***');
    useMfaStore.getState().enableChannel('email', 'an***@test.com');
    const ch = useMfaStore.getState().enabledChannels();
    expect(ch).toContain('email');
    expect(ch).toContain('telegram');
    // email always comes before telegram in the list
    expect(ch.indexOf('email')).toBeLessThan(ch.indexOf('telegram'));
  });
});

describe('requestOtp', () => {
  it('returns an error when the channel is not enabled', async () => {
    const r = await useMfaStore.getState().requestOtp('email', EPOCH);
    expect(r.error).toBe('no-channel');
    expect(r.cooldownMs).toBe(0);
  });

  it('mints a 6-digit demo code and a confirm token when the channel is enabled', async () => {
    useMfaStore.getState().enableChannel('email', 'an***@test.com');
    const r = await useMfaStore.getState().requestOtp('email', EPOCH);
    expect(r.error).toBeNull();
    expect(r.cooldownMs).toBe(0);
    expect(r.demoCode).toMatch(/^\d{6}$/);
    expect(r.demoConfirmToken).toBeTruthy();
    // The plaintext code is NOT stored in state.
    const challenge = useMfaStore.getState().demoOtpChallenges['email'];
    expect(challenge).toBeDefined();
    expect((challenge as { codeHash: string }).codeHash).toBeTruthy();
  });

  it('enforces the resend cooldown on a second call within 60 s', async () => {
    useMfaStore.getState().enableChannel('email', 'an***@test.com');
    await useMfaStore.getState().requestOtp('email', EPOCH);
    const r2 = await useMfaStore.getState().requestOtp('email', EPOCH + 1_000);
    expect(r2.error).toBeNull();
    expect(r2.cooldownMs).toBeGreaterThan(0);
    // After the cooldown window, a new request succeeds.
    const r3 = await useMfaStore.getState().requestOtp('email', EPOCH + OTP_RESEND_COOLDOWN_MS + 1);
    expect(r3.error).toBeNull();
    expect(r3.cooldownMs).toBe(0);
    expect(r3.demoCode).toMatch(/^\d{6}$/);
  });
});

describe('verifyOtp', () => {
  it('accepts the correct code and marks the challenge consumed', async () => {
    useMfaStore.getState().enableChannel('email', 'an***@test.com');
    const { demoCode } = await useMfaStore.getState().requestOtp('email', EPOCH);
    const r = await useMfaStore.getState().verifyOtp('email', demoCode!, EPOCH + 1_000);
    expect(r.error).toBeNull();
    expect(r.lockedMs).toBe(0);
    // The challenge is now consumed (single-use).
    const challenge = useMfaStore.getState().demoOtpChallenges['email'];
    expect(challenge?.consumed).toBe(true);
  });

  it('rejects a wrong code without locking while the budget remains', async () => {
    useMfaStore.getState().enableChannel('email', 'an***@test.com');
    await useMfaStore.getState().requestOtp('email', EPOCH);
    for (let i = 0; i < MAX_FAILURES - 1; i++) {
      const r = await useMfaStore.getState().verifyOtp('email', '000000', EPOCH + 1_000);
      expect(r.error).toBe('invalid-code');
      expect(r.lockedMs).toBe(0);
    }
  });

  it('locks the channel once the wrong-code budget is exhausted', async () => {
    useMfaStore.getState().enableChannel('email', 'an***@test.com');
    await useMfaStore.getState().requestOtp('email', EPOCH);
    let last = { error: null as string | null, lockedMs: 0 };
    for (let i = 0; i < MAX_FAILURES; i++) {
      last = await useMfaStore.getState().verifyOtp('email', '000000', EPOCH + 1_000);
    }
    expect(last.lockedMs).toBeGreaterThan(0);
  });

  it('rejects an expired challenge', async () => {
    useMfaStore.getState().enableChannel('email', 'an***@test.com');
    const { demoCode } = await useMfaStore.getState().requestOtp('email', EPOCH);
    // Attempt verification after the OTP_TTL_MS window.
    const r = await useMfaStore.getState().verifyOtp(
      'email',
      demoCode!,
      EPOCH + OTP_TTL_MS + 1,
    );
    expect(r.error).toBe('expired-code');
    expect(r.lockedMs).toBe(0);
  });

  it('rejects a consumed (already-used) challenge', async () => {
    useMfaStore.getState().enableChannel('email', 'an***@test.com');
    const { demoCode } = await useMfaStore.getState().requestOtp('email', EPOCH);
    // First use succeeds.
    await useMfaStore.getState().verifyOtp('email', demoCode!, EPOCH + 1_000);
    // Second use is rejected.
    const r = await useMfaStore.getState().verifyOtp('email', demoCode!, EPOCH + 2_000);
    expect(r.error).toBe('no-channel');
  });

  it('returns no-channel when no active challenge exists', async () => {
    useMfaStore.getState().enableChannel('email', 'an***@test.com');
    // No requestOtp called, so no challenge exists.
    const r = await useMfaStore.getState().verifyOtp('email', '123456', EPOCH);
    expect(r.error).toBe('no-channel');
    expect(r.lockedMs).toBe(0);
  });
});

describe('verifyConfirmToken', () => {
  it('accepts the correct confirm token and marks the challenge consumed', async () => {
    useMfaStore.getState().enableChannel('email', 'an***@test.com');
    const { demoConfirmToken } = await useMfaStore.getState().requestOtp('email', EPOCH);
    const r = await useMfaStore.getState().verifyConfirmToken(
      'email',
      demoConfirmToken!,
      EPOCH + 1_000,
    );
    expect(r.error).toBeNull();
    expect(r.lockedMs).toBe(0);
    expect(useMfaStore.getState().demoOtpChallenges['email']?.consumed).toBe(true);
  });

  it('rejects a wrong token', async () => {
    useMfaStore.getState().enableChannel('email', 'an***@test.com');
    await useMfaStore.getState().requestOtp('email', EPOCH);
    const r = await useMfaStore.getState().verifyConfirmToken(
      'email',
      'totally-wrong-token',
      EPOCH + 1_000,
    );
    expect(r.error).toBe('invalid-code');
  });

  it('rejects an expired confirm token', async () => {
    useMfaStore.getState().enableChannel('email', 'an***@test.com');
    const { demoConfirmToken } = await useMfaStore.getState().requestOtp('email', EPOCH);
    const r = await useMfaStore.getState().verifyConfirmToken(
      'email',
      demoConfirmToken!,
      EPOCH + OTP_TTL_MS + 1,
    );
    expect(r.error).toBe('expired-code');
  });

  it('rejects when no active challenge exists', async () => {
    useMfaStore.getState().enableChannel('email', 'an***@test.com');
    const r = await useMfaStore.getState().verifyConfirmToken(
      'email',
      'some-token',
      EPOCH,
    );
    expect(r.error).toBe('no-channel');
  });

  it('a consumed challenge is rejected for a second confirm-token use', async () => {
    useMfaStore.getState().enableChannel('email', 'an***@test.com');
    const { demoConfirmToken } = await useMfaStore.getState().requestOtp('email', EPOCH);
    await useMfaStore.getState().verifyConfirmToken('email', demoConfirmToken!, EPOCH + 500);
    const r = await useMfaStore.getState().verifyConfirmToken(
      'email',
      demoConfirmToken!,
      EPOCH + 1_000,
    );
    expect(r.error).toBe('no-channel');
  });
});

describe('otpResendCooldownMs', () => {
  it('returns 0 before any request', () => {
    useMfaStore.getState().enableChannel('email', 'hint');
    expect(useMfaStore.getState().otpResendCooldownMs('email', EPOCH)).toBe(0);
  });

  it('returns a positive value immediately after a request', async () => {
    useMfaStore.getState().enableChannel('email', 'hint');
    await useMfaStore.getState().requestOtp('email', EPOCH);
    const remaining = useMfaStore.getState().otpResendCooldownMs('email', EPOCH + 1_000);
    expect(remaining).toBeGreaterThan(0);
    expect(remaining).toBeLessThanOrEqual(OTP_RESEND_COOLDOWN_MS);
  });

  it('returns 0 after the cooldown window passes', async () => {
    useMfaStore.getState().enableChannel('email', 'hint');
    await useMfaStore.getState().requestOtp('email', EPOCH);
    expect(
      useMfaStore.getState().otpResendCooldownMs('email', EPOCH + OTP_RESEND_COOLDOWN_MS + 1),
    ).toBe(0);
  });
});

describe('challengeRequired with delivered channels', () => {
  it('returns true when an email channel is enabled (no TOTP)', async () => {
    useMfaStore.setState({ demoSecret: null });
    useMfaStore.getState().enableChannel('email', 'hint');
    expect(await useMfaStore.getState().challengeRequired()).toBe(true);
  });

  it('returns false when no channels and no TOTP', async () => {
    useMfaStore.setState({ demoSecret: null, demoEnabledChannels: {} });
    expect(await useMfaStore.getState().challengeRequired()).toBe(false);
  });
});
