/**
 * Request retry/backoff policy (T07). Pure helpers used to configure react-query
 * (and any manual retry loop) so transient failures self-heal with exponential
 * backoff, while deterministic client errors (most 4xx, aborted requests) fail
 * fast instead of hammering the backend.
 */

export interface BackoffOptions {
  /** Delay before the first retry. */
  baseMs?: number;
  /** Upper bound on any single delay. */
  capMs?: number;
  /** Exponential growth factor between attempts. */
  factor?: number;
}

/**
 * Exponential backoff for a 0-based retry index (react-query passes the attempt
 * index this way). Capped so a long outage never produces an unbounded wait.
 */
export function backoffDelay(attempt: number, opts: BackoffOptions = {}): number {
  const { baseMs = 400, capMs = 10_000, factor = 2 } = opts;
  const safeAttempt = attempt > 0 ? attempt : 0;
  return Math.min(capMs, baseMs * factor ** safeAttempt);
}

/** Pull an HTTP status code out of the assorted shapes errors arrive in. */
export function statusOf(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const e = error as Record<string, unknown>;
  const direct = e.status ?? e.statusCode ?? e.code;
  if (typeof direct === 'number') return direct;
  const response = e.response as Record<string, unknown> | undefined;
  if (response && typeof response.status === 'number') return response.status;
  // Some clients stringify the status into the message (e.g. "... 503 ...").
  if (typeof e.message === 'string') {
    const match = e.message.match(/\b(\d{3})\b/);
    if (match) return Number(match[1]);
  }
  return undefined;
}

/**
 * Whether an error is worth retrying. Network blips and 5xx are transient and
 * retried; an aborted request and most 4xx (a deterministic client error) are
 * not. 408 (Request Timeout) and 429 (Too Many Requests) are the 4xx exceptions
 * that do warrant a backed-off retry. Unknown shapes default to retryable so a
 * genuine transient failure is not given up on prematurely.
 */
export function isRetryableError(error: unknown): boolean {
  if (error && typeof error === 'object' && (error as { name?: string }).name === 'AbortError') {
    return false;
  }
  const status = statusOf(error);
  if (status === undefined) return true;
  if (status === 408 || status === 429) return true;
  if (status >= 400 && status < 500) return false;
  return true;
}

/**
 * react-query `retry` predicate: keep retrying while under the cap and the error
 * looks transient. `failureCount` is 1-based for the first failure.
 */
export function shouldRetry(failureCount: number, error: unknown, maxRetries = 3): boolean {
  return failureCount <= maxRetries && isRetryableError(error);
}
