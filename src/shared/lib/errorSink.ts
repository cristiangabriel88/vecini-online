import { setErrorSink, type ErrorReport } from './errorReporting';
import { enqueueOutbox, removeFromOutbox, flushOutbox } from './errorOutbox';

const ERROR_REPORT_URL = '/.netlify/functions/error-report';

/** Maximum new reports forwarded per page session (protects against error storms). */
const SESSION_LIMIT = 10;

/**
 * Build a fetch-based sink that POSTs scrubbed ErrorReports to `endpoint`.
 * Reports are written to a persisted outbox before the fetch so they survive
 * a page refresh if the network call fails. On success the outbox entry is
 * removed. Each call returns a fresh sink with its own session counter.
 */
export function buildFetchSink(endpoint: string): (report: ErrorReport) => void {
  let count = 0;
  return (report: ErrorReport): void => {
    if (count >= SESSION_LIMIT) return;
    count++;
    enqueueOutbox(report);
    void fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report),
      keepalive: true,
    }).then((resp) => {
      if (resp.ok || resp.status === 204) {
        removeFromOutbox(report.ref);
      }
    }).catch(() => {
      // network failures are expected in offline / demo mode -- leave in outbox
    });
  };
}

/**
 * Attach the production error transport. Drains any unsent reports from
 * previous sessions before registering the new sink. No-op in Vite dev mode
 * and on the Pi stage (no Netlify functions available there).
 *
 * To swap in Sentry, call `setErrorSink(sentryAdapter)` after this returns.
 */
export function initErrorSink(): void {
  if (import.meta.env.DEV) return;
  if (import.meta.env.VITE_APP_STAGE === 'dev') return;
  void flushOutbox(ERROR_REPORT_URL);
  setErrorSink(buildFetchSink(ERROR_REPORT_URL));
}
