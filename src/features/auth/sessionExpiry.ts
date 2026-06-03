/** Absolute session expiry for privileged roles (T212). */

export const PRIVILEGED_SESSION_MAX_MS = 8 * 60 * 60 * 1000; // 8 hours

const STAMP_KEY = 'vecini.auth.privilegedSigninAt';
const FORCED_SIGNOUT_KEY = 'vecini.auth.forcedSignout';

const PRIVILEGED_ROLE_SET = new Set(['admin', 'presedinte', 'comitet', 'cenzor']);

export function isPrivilegedRole(role: string | null | undefined): boolean {
  return role != null && PRIVILEGED_ROLE_SET.has(role);
}

export function stampPrivilegedSignin(now: number): void {
  try { localStorage.setItem(STAMP_KEY, String(now)); } catch { /* storage unavailable */ }
}

export function clearPrivilegedSigninStamp(): void {
  try { localStorage.removeItem(STAMP_KEY); } catch { /* storage unavailable */ }
}

export function getPrivilegedSigninAgeMs(now: number): number | null {
  try {
    const raw = localStorage.getItem(STAMP_KEY);
    if (!raw) return null;
    const stamp = Number(raw);
    if (!Number.isFinite(stamp)) return null;
    return now - stamp;
  } catch { return null; }
}

export function isPrivilegedSessionExpired(role: string | null | undefined, now: number): boolean {
  if (!isPrivilegedRole(role)) return false;
  const age = getPrivilegedSigninAgeMs(now);
  if (age === null) return false;
  return age > PRIVILEGED_SESSION_MAX_MS;
}

export function markForcedSignout(): void {
  try { sessionStorage.setItem(FORCED_SIGNOUT_KEY, 'privileged-expiry'); } catch { /* storage unavailable */ }
}

export function consumeForcedSignoutReason(): string | null {
  try {
    const reason = sessionStorage.getItem(FORCED_SIGNOUT_KEY);
    if (reason) sessionStorage.removeItem(FORCED_SIGNOUT_KEY);
    return reason;
  } catch { return null; }
}
