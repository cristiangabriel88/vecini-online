// @vitest-environment node
//
// Tests for T144: client reconciliation when the server DB-backed OTP attempt
// counter is exhausted. Exercises the live branch of verifyOtp with a mocked
// verifyOtpLive so no real network calls are made.
//
// Parity with T81 (mfaServerLockReconcile.test.ts): all second-factor brute-force
// budgets are server-held. The client otpThrottles are a convenience pre-screen,
// not a security boundary. A localStorage wipe cannot bypass the server-side
// attempt ceiling stored in the mfa_otp_challenges.attempts DB column.

import { beforeEach, describe, expect, it, vi } from 'vitest';

// Force live mode so verifyOtp takes the Supabase branch.
vi.mock('@/shared/lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'tok' } } }),
      refreshSession: vi.fn().mockResolvedValue({}),
    },
  },
}));

// Mock the otpChannelApi so we can simulate different server responses.
vi.mock('@/features/auth/otpChannelApi', () => ({
  verifyOtpLive: vi.fn(),
  requestOtpLive: vi.fn(),
  hasAppElevation: vi.fn().mockReturnValue(false),
}));

import { useMfaStore } from '@/shared/store/mfaStore';
import { verifyOtpLive } from '@/features/auth/otpChannelApi';

const EMAIL = 'email' as const;

function resetState() {
  useMfaStore.setState({
    liveEnabledChannels: { email: { targetHint: 'te***@example.com' } },
    otpThrottles: {},
  });
}

beforeEach(() => {
  resetState();
  vi.mocked(verifyOtpLive).mockReset();
});

describe('mfaStore verifyOtp -- server lock reconciliation (T144)', () => {
  it('returns channel-locked with lockedMs > 0 when the server signals challenge-locked', async () => {
    vi.mocked(verifyOtpLive).mockResolvedValue({ ok: false, error: 'challenge-locked' });

    const result = await useMfaStore.getState().verifyOtp(EMAIL, '000000');

    expect(result.error).toBe('channel-locked');
    expect(result.lockedMs).toBeGreaterThan(0);
  });

  it('does not update the client otpThrottles on a server challenge-locked signal', async () => {
    vi.mocked(verifyOtpLive).mockResolvedValue({ ok: false, error: 'challenge-locked' });

    const before = useMfaStore.getState().otpThrottles[EMAIL];
    await useMfaStore.getState().verifyOtp(EMAIL, '000000');
    const after = useMfaStore.getState().otpThrottles[EMAIL];

    // The client throttle must not have been incremented -- the server lock is authoritative.
    expect(after).toEqual(before);
  });

  it('clearing otpThrottles does not bypass the server lock', async () => {
    // The server DB counter is exhausted regardless of local state.
    vi.mocked(verifyOtpLive).mockResolvedValue({ ok: false, error: 'challenge-locked' });
    // Simulate a localStorage wipe: clear the local throttle entirely.
    useMfaStore.setState({ otpThrottles: {} });

    const result = await useMfaStore.getState().verifyOtp(EMAIL, '000000');

    // The server-held lock is still enforced.
    expect(result.error).toBe('channel-locked');
    expect(result.lockedMs).toBeGreaterThan(0);
  });

  it('increments the client otpThrottles on a wrong code when the server budget is not yet exhausted', async () => {
    vi.mocked(verifyOtpLive).mockResolvedValue({ ok: false, error: 'invalid-code' });

    const beforeLength = useMfaStore.getState().otpThrottles[EMAIL]?.failures.length ?? 0;
    await useMfaStore.getState().verifyOtp(EMAIL, '000000');
    const afterLength = useMfaStore.getState().otpThrottles[EMAIL]?.failures.length ?? 0;

    // The client pre-screen IS updated on a wrong credential (not yet server-locked).
    expect(afterLength).toBeGreaterThan(beforeLength);
  });

  it('resets the client otpThrottles on a successful verify', async () => {
    // Prime a failed attempt so the throttle is non-empty.
    vi.mocked(verifyOtpLive).mockResolvedValueOnce({ ok: false, error: 'invalid-code' });
    await useMfaStore.getState().verifyOtp(EMAIL, '000000');
    expect(
      useMfaStore.getState().otpThrottles[EMAIL]?.failures.length ?? 0,
    ).toBeGreaterThan(0);

    // Now succeed.
    vi.mocked(verifyOtpLive).mockResolvedValueOnce({ ok: true });
    const result = await useMfaStore.getState().verifyOtp(EMAIL, '123456');

    expect(result.error).toBeNull();
    expect(result.lockedMs).toBe(0);
    // The client throttle is cleared to zero failures.
    expect(useMfaStore.getState().otpThrottles[EMAIL]?.failures.length ?? 0).toBe(0);
  });
});
