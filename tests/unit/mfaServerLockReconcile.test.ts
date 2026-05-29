// @vitest-environment node
//
// Tests for T81: client reconciliation when the server DB-backed recovery
// attempt counter is exhausted. Exercises the live branch of verifyChallenge
// with a mocked recoveryVerifyApi so no real network calls are made.

import { beforeEach, describe, expect, it, vi } from 'vitest';

// Force live mode so verifyChallenge takes the Supabase branch.
vi.mock('@/shared/lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'tok' } } }),
      refreshSession: vi.fn().mockResolvedValue({}),
      mfa: {
        listFactors: vi.fn().mockResolvedValue({ data: { totp: [] } }),
        challenge: vi.fn(),
        verify: vi.fn(),
      },
    },
  },
}));

// Mock the recoveryVerifyApi so we can simulate different server responses.
vi.mock('@/features/auth/recoveryVerifyApi', () => ({
  verifyRecoveryCodeLive: vi.fn(),
}));

import { useMfaStore } from '@/shared/store/mfaStore';
import { emptyThrottle } from '@/features/auth/loginThrottle';
import { verifyRecoveryCodeLive } from '@/features/auth/recoveryVerifyApi';

// Use a code that is NOT a 6-digit TOTP string so verifyChallenge takes the
// recovery-code branch (live path).
const RECOVERY_INPUT = 'ABCD-EFGH';

function resetState() {
  useMfaStore.setState({
    enrolled: true,
    demoSecret: 'JBSWY3DPEHPK3PXP',
    demoRecoveryHashes: [],
    challengeThrottle: emptyThrottle(),
  });
}

beforeEach(() => {
  resetState();
  vi.mocked(verifyRecoveryCodeLive).mockReset();
});

describe('mfaStore verifyChallenge -- server lock reconciliation (T81)', () => {
  it('returns lockedMs > 0 when the server signals attempt-limit-exceeded', async () => {
    vi.mocked(verifyRecoveryCodeLive).mockResolvedValue({
      ok: false,
      error: 'attempt-limit-exceeded',
    });

    const result = await useMfaStore.getState().verifyChallenge(RECOVERY_INPUT);

    expect(result.error).toBe('attempt-limit-exceeded');
    expect(result.lockedMs).toBeGreaterThan(0);
  });

  it('does not increment the client challengeThrottle on a server lock', async () => {
    vi.mocked(verifyRecoveryCodeLive).mockResolvedValue({
      ok: false,
      error: 'attempt-limit-exceeded',
    });

    const before = useMfaStore.getState().challengeThrottle;
    await useMfaStore.getState().verifyChallenge(RECOVERY_INPUT);
    const after = useMfaStore.getState().challengeThrottle;

    // Failures list must not have grown -- a server lock is not a credential guess.
    expect(after.failures.length).toBe(before.failures.length);
    expect(after.lockedUntil).toBe(before.lockedUntil);
  });

  it('still returns lockedMs = 0 for an invalid code when the budget is not yet exhausted', async () => {
    vi.mocked(verifyRecoveryCodeLive).mockResolvedValue({
      ok: false,
      error: 'invalid-code',
    });

    const result = await useMfaStore.getState().verifyChallenge(RECOVERY_INPUT);

    expect(result.error).toBe('invalid-code');
    // lockedMs is 0 until MAX_FAILURES wrong guesses are accumulated.
    expect(result.lockedMs).toBe(0);
  });

  it('succeeds and clears the local throttle when the server accepts the code', async () => {
    vi.mocked(verifyRecoveryCodeLive).mockResolvedValue({ ok: true });

    const result = await useMfaStore.getState().verifyChallenge(RECOVERY_INPUT);

    expect(result.error).toBeNull();
    expect(result.lockedMs).toBe(0);
    expect(useMfaStore.getState().challengeLockMs()).toBe(0);
  });
});
