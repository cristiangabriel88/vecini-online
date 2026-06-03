/** Sliding-window cooldown for password-reset requests (T198). */

export const COOLDOWN_MS = 60_000;

const KEY_PREFIX = 'pr_cd_';

function normalise(email: string): string {
  return email.trim().toLowerCase();
}

function storageKey(email: string): string {
  return KEY_PREFIX + normalise(email);
}

/** Milliseconds remaining on the cooldown, 0 when not on cooldown. */
export function remainingCooldownMs(email: string, now: number): number {
  if (!email) return 0;
  try {
    const raw = sessionStorage.getItem(storageKey(email));
    if (!raw) return 0;
    const ts = parseInt(raw, 10);
    if (isNaN(ts)) return 0;
    return Math.max(0, ts + COOLDOWN_MS - now);
  } catch {
    return 0;
  }
}

export function isOnCooldown(email: string, now: number): boolean {
  return remainingCooldownMs(email, now) > 0;
}

/** Record that a reset was requested now; persists across hard refreshes. */
export function recordResetRequest(email: string, now: number): void {
  if (!email) return;
  try {
    sessionStorage.setItem(storageKey(email), String(now));
  } catch {
    // sessionStorage unavailable (e.g. private mode) - degrade silently
  }
}

/** Remove cooldown (for tests). */
export function clearResetCooldown(email: string): void {
  try {
    sessionStorage.removeItem(storageKey(email));
  } catch {
    // ignore
  }
}
