/**
 * Client-side error reporting (T07). Pure, dependency-free, and privacy-first:
 *
 * - Every report is **scrubbed of PII** before it leaves `buildReport`, so an
 *   email, phone number, auth token or JWT in an error message or stack never
 *   reaches a sink or the console.
 * - Transport is a **pluggable sink** (`setErrorSink`), so a real backend
 *   (Sentry, a Netlify collector, the audit stream) can be attached in
 *   production without touching any call site. No sink is wired by default, so
 *   reporting is a no-op outside dev until one is set — keeping the bundle free
 *   of a reporting dependency while staying Sentry-ready.
 * - Each report carries a short, human-quotable **reference code** so a resident
 *   can give support a code that ties back to the logged event with no PII.
 */

export interface ErrorContext {
  /** Where the error happened: a route, a component, a store action. */
  source?: string;
  /** Extra non-PII breadcrumbs (e.g. feature key, http status). String values are scrubbed defensively. */
  extra?: Record<string, string | number | boolean | null | undefined>;
}

export interface ErrorReport {
  /** Short support reference code (e.g. `IV-K3F9-7Q27`). */
  ref: string;
  /** Error class name. */
  name: string;
  /** Scrubbed error message. */
  message: string;
  /** Scrubbed stack, when available. */
  stack?: string;
  /** Originating area. */
  source?: string;
  /** Scrubbed breadcrumbs. */
  extra?: Record<string, string | number | boolean | null>;
  /** Epoch ms the report was built. */
  at: number;
  /** Build release identifier (git short SHA or CI commit ref). */
  release?: string;
  /** Deployment stage the report was captured on (prod | dev | demo). */
  stage?: string;
}

export type ErrorSink = (report: ErrorReport) => void;

/**
 * Redact direct identifiers from a free-text string. Order matters: structured
 * secrets (JWT, bearer, key params) are removed before the generic email/phone
 * passes so a token is never partially matched as something else. Pseudonymous
 * UUIDs are intentionally kept — they aid debugging and are not direct identifiers.
 */
export function scrubMessage(input: string): string {
  return input
    // JSON Web Tokens (header.payload.signature)
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[token]')
    // Authorization: Bearer <token>
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [token]')
    // Supabase / OAuth secrets carried as query or body params
    .replace(/(apikey|access_token|refresh_token|api_key|password|token)=[^&\s"']+/gi, '$1=[redacted]')
    // Email addresses
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[email]')
    // Long standalone digit runs: phone numbers, IBAN tails, card numbers
    // (9+ digits). The surrounding guards keep digits embedded in a hyphenated
    // or word token (e.g. a UUID segment) intact.
    .replace(/(?<![\w-])\d{9,}(?![\w-])/g, '[number]');
}

function scrubExtra(
  extra: ErrorContext['extra'],
): Record<string, string | number | boolean | null> | undefined {
  if (!extra) return undefined;
  const out: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(extra)) {
    if (value === undefined) continue;
    out[key] = typeof value === 'string' ? scrubMessage(value) : value;
  }
  return Object.keys(out).length ? out : undefined;
}

/** Normalise any thrown value into a name + message, never throwing itself. */
export function normalizeError(error: unknown): { name: string; message: string; stack?: string } {
  if (error instanceof Error) {
    return { name: error.name || 'Error', message: error.message || String(error), stack: error.stack };
  }
  if (typeof error === 'string') return { name: 'Error', message: error };
  try {
    return { name: 'Error', message: JSON.stringify(error) ?? 'Unknown error' };
  } catch {
    return { name: 'Error', message: 'Unknown error' };
  }
}

/**
 * Build a short, quotable reference code. Deterministic given its inputs so it
 * can be unit-tested; the live `reportError` passes the real clock + RNG.
 */
export function makeRef(now: number, rand: number): string {
  const block = (n: number) =>
    Math.abs(Math.floor(n))
      .toString(36)
      .toUpperCase()
      .slice(-4)
      .padStart(4, '0');
  return `IV-${block(now)}-${block(rand * 0xffffffff)}`;
}

/** Pure: assemble a scrubbed report from a thrown value. */
export function buildReport(
  error: unknown,
  context: ErrorContext,
  ref: string,
  now: number,
  release?: string,
  stage?: string,
): ErrorReport {
  const { name, message, stack } = normalizeError(error);
  return {
    ref,
    name,
    message: scrubMessage(message),
    stack: stack ? scrubMessage(stack) : undefined,
    source: context.source,
    extra: scrubExtra(context.extra),
    at: now,
    ...(release ? { release } : {}),
    ...(stage ? { stage } : {}),
  };
}

let sink: ErrorSink | null = null;

/** Attach the production transport (e.g. Sentry). Replaces any prior sink. */
export function setErrorSink(next: ErrorSink | null): void {
  sink = next;
}

const MAX_BUFFER = 100;
const _reportBuffer: ErrorReport[] = [];

/** Read the in-process report buffer (last 100 reports). Used by the platform error feed in demo mode. */
export function getReportBuffer(): readonly ErrorReport[] {
  return _reportBuffer;
}

/**
 * Report an error: scrub it, hand the report to the sink (if any), and in dev
 * surface a compact console line. Returns the report so callers (e.g. the error
 * boundary) can show its reference code to the user. Never throws.
 */
export function reportError(error: unknown, context: ErrorContext = {}): ErrorReport {
  const release = import.meta.env.VITE_APP_RELEASE;
  const stage = import.meta.env.VITE_APP_STAGE;
  const report = buildReport(error, context, makeRef(Date.now(), Math.random()), Date.now(), release, stage);
  if (_reportBuffer.length >= MAX_BUFFER) _reportBuffer.shift();
  _reportBuffer.push(report);
  try {
    sink?.(report);
  } catch {
    // A failing sink must never mask the original error.
  }
  if (import.meta.env.DEV) {
    console.error(`[${report.ref}] ${report.source ?? 'error'}: ${report.name} - ${report.message}`);
  }
  return report;
}

/**
 * Register window-level handlers so errors outside React's render tree
 * (unhandled promise rejections, async callbacks) are reported too. Idempotent;
 * returns a cleanup function.
 */
export function installGlobalErrorHandlers(): () => void {
  const onError = (event: ErrorEvent) => {
    reportError(event.error ?? event.message, { source: 'window.onerror' });
  };
  const onRejection = (event: PromiseRejectionEvent) => {
    reportError(event.reason, { source: 'unhandledrejection' });
  };
  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onRejection);
  return () => {
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onRejection);
  };
}
