/**
 * "Remember me" session persistence.
 *
 * By default a session is kept in `sessionStorage`, so it is cleared when the
 * browser is fully closed and an idle timeout signs the user out after a period
 * of inactivity (the secure default for an app holding financial + personal
 * data). When the resident opts in via the login checkbox, the session is moved
 * to `localStorage` so it survives a restart, bounded by a 30-day absolute cap.
 *
 * The Supabase client persists its session through a single storage adapter
 * fixed at client-creation time, so `rememberStorage` routes reads/writes to the
 * right backing store based on the remember flag (which the store sets just
 * before sign-in). The flag itself always lives in `localStorage` so the adapter
 * keeps routing the same way across reloads and silent token refreshes.
 */

const REMEMBER_FLAG_KEY = 'vecini.auth.remember';
const REMEMBERED_AT_KEY = 'vecini.auth.rememberedAt';

/** A remembered session is forced to re-authenticate after this long, even if active. */
export const ABSOLUTE_CAP_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
/** A non-remembered session is signed out after this much inactivity. */
export const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

function safeGet(store: Storage, key: string): string | null {
  try {
    return store.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(store: Storage, key: string, value: string): void {
  try {
    store.setItem(key, value);
  } catch {
    /* storage unavailable (private mode / quota) — non-fatal */
  }
}

function safeRemove(store: Storage, key: string): void {
  try {
    store.removeItem(key);
  } catch {
    /* storage unavailable — non-fatal */
  }
}

/** Whether the current device opted into a persistent ("remembered") session. */
export function isRemembered(): boolean {
  return safeGet(localStorage, REMEMBER_FLAG_KEY) === 'true';
}

/**
 * Record the resident's "remember me" choice. Must be called before the session
 * is written (i.e. before `signInWithPassword`) so `rememberStorage` routes the
 * freshly created session into the right backing store. Turning it on stamps the
 * moment for the absolute-cap check; turning it off clears both keys.
 */
export function setRemembered(value: boolean): void {
  if (value) {
    safeSet(localStorage, REMEMBER_FLAG_KEY, 'true');
    safeSet(localStorage, REMEMBERED_AT_KEY, String(Date.now()));
  } else {
    safeRemove(localStorage, REMEMBER_FLAG_KEY);
    safeRemove(localStorage, REMEMBERED_AT_KEY);
  }
}

/** True when a remembered session has outlived the 30-day absolute cap. */
export function rememberExpired(): boolean {
  if (!isRemembered()) return false;
  const raw = safeGet(localStorage, REMEMBERED_AT_KEY);
  const stamp = raw ? Number(raw) : NaN;
  if (!Number.isFinite(stamp)) return false;
  return Date.now() - stamp > ABSOLUTE_CAP_MS;
}

/**
 * Supabase storage adapter that routes the session to `localStorage` when the
 * device is remembered and `sessionStorage` otherwise. Reads consult both stores
 * so an existing session is always found (and a pre-existing localStorage session
 * migrates to sessionStorage on its next write when not remembered — the safer
 * outcome). The Supabase auth `storage` contract may be async, so the synchronous
 * values returned here satisfy it directly.
 */
export const rememberStorage = {
  getItem(key: string): string | null {
    const persistent = safeGet(localStorage, key);
    if (persistent !== null) return persistent;
    return safeGet(sessionStorage, key);
  },
  setItem(key: string, value: string): void {
    if (isRemembered()) {
      safeSet(localStorage, key, value);
      safeRemove(sessionStorage, key);
    } else {
      safeSet(sessionStorage, key, value);
      safeRemove(localStorage, key);
    }
  },
  removeItem(key: string): void {
    safeRemove(localStorage, key);
    safeRemove(sessionStorage, key);
  },
};
