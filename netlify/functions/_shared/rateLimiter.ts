// Sliding-window in-memory rate limiter for Netlify functions (T148).
//
// Each Lambda instance holds its own Map so the limit applies per function
// instance (not globally across the cluster), which is fine for burst
// protection at this stage. A DB-backed counter is the T144-equivalent
// follow-up when stronger global enforcement is needed.

/** Sliding-window state for one key. */
interface Entry {
  /** Sorted epoch-ms timestamps of accepted requests within the current window. */
  timestamps: number[];
}

/**
 * Check whether a request is within the rate limit for `key` and, if so,
 * record the attempt. Returns `true` when the request should be allowed, `false`
 * when it exceeds the limit.
 *
 * Pure side-effect-free version: accepts the store explicitly so it can be
 * unit-tested without module-level state.
 */
export function checkSlidingWindow(
  store: Map<string, Entry>,
  key: string,
  now: number,
  windowMs: number,
  maxCount: number,
): boolean {
  const prev = store.get(key) ?? { timestamps: [] };
  const cutoff = now - windowMs;
  const recent = prev.timestamps.filter((t) => t > cutoff);
  if (recent.length >= maxCount) {
    // Evict expired entries even on a rejected request.
    store.set(key, { timestamps: recent });
    return false;
  }
  recent.push(now);
  store.set(key, { timestamps: recent });
  return true;
}

// Production singleton store shared across calls within the same Lambda instance.
const _store = new Map<string, Entry>();

/**
 * Default rate-limit parameters for the invite-email function:
 * max 20 sends per 10 minutes per caller+asociatie key.
 */
const DEFAULT_WINDOW_MS = 10 * 60 * 1000;
const DEFAULT_MAX = 20;

/**
 * Record one invite-email send attempt for `key` and return whether it is
 * within the default limits (20 per 10 min). Pass a custom `now` for testing.
 */
export function checkInviteRateLimit(key: string, now: number = Date.now()): boolean {
  return checkSlidingWindow(_store, key, now, DEFAULT_WINDOW_MS, DEFAULT_MAX);
}
