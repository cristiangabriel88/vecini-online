import { describe, expect, it } from 'vitest';
import {
  FAILURE_WINDOW_MS,
  LOCKOUT_BASE_MS,
  MAX_FAILURES,
  MAX_LOCKOUT_MS,
  attemptsRemaining,
  emptyThrottle,
  isLocked,
  registerFailure,
  registerSuccess,
  remainingLockMs,
  throttleKey,
} from '@/features/auth/loginThrottle';

const NOW = 1_000_000;

describe('throttleKey', () => {
  it('normalises case and surrounding whitespace', () => {
    expect(throttleKey('  Ana@Vecini.RO ')).toBe('ana@vecini.ro');
  });
});

describe('registerFailure', () => {
  it('does not lock before the failure budget is exhausted', () => {
    let s = emptyThrottle();
    for (let i = 0; i < MAX_FAILURES - 1; i++) s = registerFailure(s, NOW);
    expect(isLocked(s, NOW)).toBe(false);
    expect(attemptsRemaining(s, NOW)).toBe(1);
  });

  it('locks once the budget is exhausted', () => {
    let s = emptyThrottle();
    for (let i = 0; i < MAX_FAILURES; i++) s = registerFailure(s, NOW);
    expect(isLocked(s, NOW)).toBe(true);
    expect(remainingLockMs(s, NOW)).toBe(LOCKOUT_BASE_MS);
    expect(attemptsRemaining(s, NOW)).toBe(0);
  });

  it('expires old failures outside the sliding window', () => {
    let s = emptyThrottle();
    for (let i = 0; i < MAX_FAILURES - 1; i++) s = registerFailure(s, NOW);
    // A failure long after the window should not combine with the stale ones.
    const later = NOW + FAILURE_WINDOW_MS + 1;
    s = registerFailure(s, later);
    expect(isLocked(s, later)).toBe(false);
    expect(attemptsRemaining(s, later)).toBe(MAX_FAILURES - 1);
  });

  it('escalates the lockout duration on repeat offences', () => {
    let s = emptyThrottle();
    for (let i = 0; i < MAX_FAILURES; i++) s = registerFailure(s, NOW);
    expect(remainingLockMs(s, NOW)).toBe(LOCKOUT_BASE_MS);

    // After the first lock expires, a second round of failures locks longer.
    const after = s.lockedUntil + 1;
    for (let i = 0; i < MAX_FAILURES; i++) s = registerFailure(s, after);
    expect(remainingLockMs(s, after)).toBe(LOCKOUT_BASE_MS * 2);
  });

  it('caps the escalating lockout at the ceiling', () => {
    let s = emptyThrottle();
    let t = NOW;
    for (let round = 0; round < 12; round++) {
      for (let i = 0; i < MAX_FAILURES; i++) s = registerFailure(s, t);
      t = s.lockedUntil + 1;
    }
    // Re-derive the last applied lock by replaying one more round at a known time.
    let s2 = { ...s, failures: [] as number[] };
    for (let i = 0; i < MAX_FAILURES; i++) s2 = registerFailure(s2, t);
    expect(remainingLockMs(s2, t)).toBe(MAX_LOCKOUT_MS);
  });

  it('ignores attempts made while already locked', () => {
    let s = emptyThrottle();
    for (let i = 0; i < MAX_FAILURES; i++) s = registerFailure(s, NOW);
    const locked = { ...s };
    const after = registerFailure(s, NOW + 1);
    expect(after).toEqual(locked);
  });
});

describe('registerSuccess', () => {
  it('clears all failure and lock state', () => {
    let s = emptyThrottle();
    for (let i = 0; i < MAX_FAILURES; i++) s = registerFailure(s, NOW);
    expect(isLocked(s, NOW)).toBe(true);
    const cleared = registerSuccess();
    expect(cleared).toEqual(emptyThrottle());
    expect(isLocked(cleared, NOW)).toBe(false);
  });
});
