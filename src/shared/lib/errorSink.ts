import { setErrorSink, type ErrorReport } from './errorReporting';

const ERROR_REPORT_URL = '/.netlify/functions/error-report';

/** Maximum reports forwarded per page session (protects against error storms). */
const SESSION_LIMIT = 10;

/**
 * Build a fetch-based sink that POSTs scrubbed ErrorReports to `endpoint`.
 * Each call returns a fresh sink with its own session counter so it can be
 * unit-tested without shared module state.
 */
export function buildFetchSink(endpoint: string): (report: ErrorReport) => void {
  let count = 0;
  return (report: ErrorReport): void => {
    if (count >= SESSION_LIMIT) return;
    count++;
    void fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report),
      keepalive: true,
    }).catch(() => {
      // network failures are expected in offline / demo mode -- never throw
    });
  };
}

/**
 * Attach the production error transport. Wires the fetch sink to the
 * self-hosted Netlify collector. No-op in Vite dev mode (browser console
 * already surfaces errors there).
 *
 * To swap in Sentry, call `setErrorSink(sentryAdapter)` after this returns.
 */
export function initErrorSink(): void {
  if (import.meta.env.DEV) return;
  if (import.meta.env.VITE_APP_STAGE === 'dev') return; // Pi preview has no Netlify functions
  setErrorSink(buildFetchSink(ERROR_REPORT_URL));
}
