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

// Per-IP store for the invite-email function.
const _ipStore = new Map<string, Entry>();

/** Max invite-email sends per IP per minute (burst protection). */
const IP_WINDOW_MS = 60_000;
const IP_MAX = 5;

/**
 * Record one invite-email send attempt for `ip` and return whether it is within
 * the per-IP burst limit (5 per 60 s). A missing/null IP is always allowed (no
 * IP could be extracted from behind a proxy).
 */
export function checkIpRateLimit(ip: string, now: number = Date.now()): boolean {
  return checkSlidingWindow(_ipStore, ip, now, IP_WINDOW_MS, IP_MAX);
}

// Per-IP store for csp-report (50 reports / 60 s).
const _cspStore = new Map<string, Entry>();
const CSP_WINDOW_MS = 60_000;
const CSP_MAX = 50;

/** Record one csp-report request for `ip` and return whether it is within the
 *  burst limit (50 per 60 s). */
export function checkCspReportRateLimit(ip: string, now: number = Date.now()): boolean {
  return checkSlidingWindow(_cspStore, ip, now, CSP_WINDOW_MS, CSP_MAX);
}

// Per-uid store for notify-email (30 emails / 10 min).
const _notifyEmailStore = new Map<string, Entry>();
const NOTIFY_EMAIL_WINDOW_MS = 10 * 60_000;
const NOTIFY_EMAIL_MAX = 30;

/** Record one notify-email dispatch for authenticated `uid` and return whether
 *  it is within the limit (30 per 10 min). */
export function checkNotifyEmailRateLimit(uid: string, now: number = Date.now()): boolean {
  return checkSlidingWindow(_notifyEmailStore, uid, now, NOTIFY_EMAIL_WINDOW_MS, NOTIFY_EMAIL_MAX);
}

// Per-uid store for generate-pv-pdf (5 PDFs / 60 s).
const _pvPdfStore = new Map<string, Entry>();
const PV_PDF_WINDOW_MS = 60_000;
const PV_PDF_MAX = 5;

/** Record one PDF generation request for authenticated `uid` and return whether
 *  it is within the burst limit (5 per 60 s). */
export function checkPvPdfRateLimit(uid: string, now: number = Date.now()): boolean {
  return checkSlidingWindow(_pvPdfStore, uid, now, PV_PDF_WINDOW_MS, PV_PDF_MAX);
}

// Per-IP store for provision-asociatie (20 requests / 60 min).
const _provisionStore = new Map<string, Entry>();
const PROVISION_WINDOW_MS = 60 * 60_000;
const PROVISION_MAX = 20;

/** Record one provision-asociatie request for `ip` and return whether it is
 *  within the limit (20 per 60 min). */
export function checkProvisionRateLimit(ip: string, now: number = Date.now()): boolean {
  return checkSlidingWindow(_provisionStore, ip, now, PROVISION_WINDOW_MS, PROVISION_MAX);
}

// Per-uid:ip store for mfa-otp-verify + mfa-recovery-verify (10 attempts / 5 min).
const _mfaVerifyStore = new Map<string, Entry>();
const MFA_VERIFY_WINDOW_MS = 5 * 60_000;
const MFA_VERIFY_MAX = 10;

/** Record one MFA verify attempt for `key` (userId:ip) and return whether it is
 *  within the limit (10 per 5 min). Applies to both OTP verify and recovery verify. */
export function checkMfaVerifyRateLimit(key: string, now: number = Date.now()): boolean {
  return checkSlidingWindow(_mfaVerifyStore, key, now, MFA_VERIFY_WINDOW_MS, MFA_VERIFY_MAX);
}

// Per-uid:ip store for mfa-otp-request (5 requests / 15 min).
const _mfaRequestStore = new Map<string, Entry>();
const MFA_REQUEST_WINDOW_MS = 15 * 60_000;
const MFA_REQUEST_MAX = 5;

/** Record one MFA OTP request for `key` (userId:ip) and return whether it is
 *  within the limit (5 per 15 min). */
export function checkMfaRequestRateLimit(key: string, now: number = Date.now()): boolean {
  return checkSlidingWindow(_mfaRequestStore, key, now, MFA_REQUEST_WINDOW_MS, MFA_REQUEST_MAX);
}
