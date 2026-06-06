import type { ErrorReport } from './errorReporting';

const OUTBOX_KEY = 'iv_error_outbox';
const MAX_OUTBOX = 20;

function readOutbox(): ErrorReport[] {
  try {
    const raw = localStorage.getItem(OUTBOX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ErrorReport[]) : [];
  } catch {
    return [];
  }
}

function writeOutbox(items: ErrorReport[]): void {
  try {
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(items.slice(-MAX_OUTBOX)));
  } catch {
    // Quota exceeded -- silently drop oldest
  }
}

/** Add a report to the persisted outbox. Survives page refresh. */
export function enqueueOutbox(report: ErrorReport): void {
  const items = readOutbox();
  if (items.some((r) => r.ref === report.ref)) return;
  items.push(report);
  writeOutbox(items);
}

/** Remove a report from the outbox after it has been successfully sent. */
export function removeFromOutbox(ref: string): void {
  writeOutbox(readOutbox().filter((r) => r.ref !== ref));
}

/** Returns the current outbox contents (for testing). */
export function getOutbox(): readonly ErrorReport[] {
  return readOutbox();
}

/**
 * Attempt to send all queued outbox items to the given endpoint.
 * Items that receive a 2xx/204 response are removed from the outbox.
 * Network failures leave items in the outbox for retry on the next session.
 */
export async function flushOutbox(endpoint: string): Promise<void> {
  const items = readOutbox();
  if (!items.length) return;
  for (const report of items) {
    try {
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report),
      });
      if (resp.ok || resp.status === 204) {
        removeFromOutbox(report.ref);
      }
    } catch {
      // Leave in outbox; will retry next session
    }
  }
}
