/**
 * Client-side login rate limiting with escalating temporary lockout (T03).
 *
 * Pure functions over a plain `ThrottleState` so they unit-test in isolation and
 * the persisted store stays a thin wrapper. The state is kept per normalised
 * email. This is a first line of defence that slows down online password
 * guessing from a given browser; it complements, and does not replace, the
 * server-side rate limiting Supabase Auth applies. The MFA challenge step has
 * its own throttle (T31).
 *
 * Lockout escalates: each time the failure budget is exhausted the lock doubles,
 * capped at `MAX_LOCKOUT_MS`, so repeated abuse from one browser backs off hard
 * while an honest typo never locks anyone out.
 */

/** Failures counted within this sliding window trigger a lockout. */
export const FAILURE_WINDOW_MS = 15 * 60_000;
/** Number of failures within the window that triggers a lockout. */
export const MAX_FAILURES = 5;
/** First lockout duration; doubles on each subsequent lockout. */
export const LOCKOUT_BASE_MS = 60_000;
/** Hard ceiling on a single lockout. */
export const MAX_LOCKOUT_MS = 30 * 60_000;

export interface ThrottleState {
  /** Epoch-ms timestamps of recent failures within the window. */
  failures: number[];
  /** Epoch-ms instant until which sign-in is locked, or 0 when not locked. */
  lockedUntil: number;
  /** How many times this identifier has been locked (drives escalation). */
  lockoutCount: number;
}

export function emptyThrottle(): ThrottleState {
  return { failures: [], lockedUntil: 0, lockoutCount: 0 };
}

/** Normalise an email into a stable throttle key. */
export function throttleKey(email: string): string {
  return email.trim().toLowerCase();
}

/** Drop failures that have aged out of the sliding window. */
function prune(failures: number[], now: number): number[] {
  return failures.filter((t) => now - t < FAILURE_WINDOW_MS);
}

export function isLocked(state: ThrottleState, now: number): boolean {
  return state.lockedUntil > now;
}

/** Milliseconds remaining on the current lockout (0 when not locked). */
export function remainingLockMs(state: ThrottleState, now: number): number {
  return Math.max(0, state.lockedUntil - now);
}

/** How many failures remain before the next lockout (0 while locked). */
export function attemptsRemaining(state: ThrottleState, now: number): number {
  if (isLocked(state, now)) return 0;
  return Math.max(0, MAX_FAILURES - prune(state.failures, now).length);
}

/**
 * Record a failed sign-in. Returns the next state. When the failure budget is
 * exhausted the identifier is locked for an escalating duration and the failure
 * list is cleared (a fresh budget starts after the lock expires).
 */
export function registerFailure(state: ThrottleState, now: number): ThrottleState {
  // While already locked, extra attempts neither help nor extend the lock.
  if (isLocked(state, now)) return state;

  const failures = [...prune(state.failures, now), now];
  if (failures.length >= MAX_FAILURES) {
    const duration = Math.min(LOCKOUT_BASE_MS * 2 ** state.lockoutCount, MAX_LOCKOUT_MS);
    return { failures: [], lockedUntil: now + duration, lockoutCount: state.lockoutCount + 1 };
  }
  return { ...state, failures, lockedUntil: 0 };
}

/** A successful sign-in clears the failure history and any lock for that key. */
export function registerSuccess(): ThrottleState {
  return emptyThrottle();
}
