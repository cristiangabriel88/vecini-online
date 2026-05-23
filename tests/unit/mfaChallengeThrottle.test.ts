import { beforeEach, describe, expect, it } from 'vitest';
import { useMfaStore } from '@/shared/store/mfaStore';
import { generateRecoveryCodes, hashRecoveryCodes } from '@/features/auth/mfaLogic';
import { MAX_FAILURES, emptyThrottle } from '@/features/auth/loginThrottle';

/**
 * Integration coverage for the login-time MFA challenge throttle (T31): a wrong
 * code is rate-limited with an escalating temporary lockout, while config errors
 * never lock anyone out and a correct code clears the budget. Runs against the
 * offline demo path (no backend), where the challenge is genuine TOTP/recovery.
 *
 * Wrong attempts use a non-TOTP-format string so they take the recovery branch
 * and miss deterministically (no dependence on the wall-clock TOTP window).
 */
const WRONG = 'nope-nope-nope';
const SECRET = 'JBSWY3DPEHPK3PXP';

function resetEnrolled() {
  useMfaStore.setState({
    enrolled: true,
    demoSecret: SECRET,
    demoRecoveryHashes: [],
    challengeThrottle: emptyThrottle(),
  });
}

beforeEach(resetEnrolled);

describe('mfaStore challenge throttle (T31)', () => {
  it('rejects a wrong code without locking while the budget remains', async () => {
    for (let i = 0; i < MAX_FAILURES - 1; i++) {
      const r = await useMfaStore.getState().verifyChallenge(WRONG);
      expect(r.error).toBe('invalid-code');
      expect(r.lockedMs).toBe(0);
    }
    expect(useMfaStore.getState().challengeLockMs()).toBe(0);
  });

  it('locks the challenge once the wrong-code budget is exhausted', async () => {
    let last = { error: null as string | null, lockedMs: 0 };
    for (let i = 0; i < MAX_FAILURES; i++) {
      last = await useMfaStore.getState().verifyChallenge(WRONG);
    }
    expect(last.lockedMs).toBeGreaterThan(0);
    expect(useMfaStore.getState().challengeLockMs()).toBeGreaterThan(0);
  });

  it('refuses further attempts while locked without evaluating the code', async () => {
    for (let i = 0; i < MAX_FAILURES; i++) {
      await useMfaStore.getState().verifyChallenge(WRONG);
    }
    const refused = await useMfaStore.getState().verifyChallenge(WRONG);
    expect(refused.error).toBe('locked');
    expect(refused.lockedMs).toBeGreaterThan(0);
  });

  it('does not throttle a config error (not enrolled is not a credential guess)', async () => {
    useMfaStore.setState({ demoSecret: null, challengeThrottle: emptyThrottle() });
    for (let i = 0; i < MAX_FAILURES + 2; i++) {
      const r = await useMfaStore.getState().verifyChallenge('123456');
      expect(r.error).toBe('not-enrolled');
      expect(r.lockedMs).toBe(0);
    }
    expect(useMfaStore.getState().challengeLockMs()).toBe(0);
  });

  it('a correct recovery code succeeds and clears the failure budget', async () => {
    const codes = generateRecoveryCodes();
    useMfaStore.setState({ demoRecoveryHashes: await hashRecoveryCodes(codes) });

    // Bank some failures (short of a lock), then verify a real recovery code.
    for (let i = 0; i < MAX_FAILURES - 1; i++) {
      await useMfaStore.getState().verifyChallenge(WRONG);
    }
    const ok = await useMfaStore.getState().verifyChallenge(codes[0]);
    expect(ok.error).toBeNull();
    expect(ok.lockedMs).toBe(0);
    expect(useMfaStore.getState().challengeLockMs()).toBe(0);
  });
});
