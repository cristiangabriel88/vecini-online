// Pure alert-trigger logic for error-report alerting (T258c).
// No side effects; designed for unit testing in isolation.

export type AlertTrigger = 'new-group' | 'spike';

/** True when a new-group alert should fire (respects the de-dup window). */
export function shouldAlertNewGroup(
  lastAlertAt: number | null,
  now: number,
  dedupWindowMs: number,
): boolean {
  if (lastAlertAt === null) return true;
  return now - lastAlertAt > dedupWindowMs;
}

/**
 * True when a spike alert should fire.
 * Requires recentCount >= spikeThreshold AND the de-dup window has elapsed.
 */
export function shouldAlertSpike(
  recentCount: number,
  spikeThreshold: number,
  lastAlertAt: number | null,
  now: number,
  dedupWindowMs: number,
): boolean {
  if (recentCount < spikeThreshold) return false;
  if (lastAlertAt === null) return true;
  return now - lastAlertAt > dedupWindowMs;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Compose a plain-text and HTML alert email for ops internal use (English only). */
export function buildAlertEmail(params: {
  trigger: AlertTrigger;
  name: string;
  source: string | undefined;
  message: string;
  stage: string | undefined;
  release: string | undefined;
  ref: string;
  recentCount?: number;
}): { subject: string; text: string; html: string } {
  const { trigger, name, source, message, stage, release, ref, recentCount } = params;
  const loc = source ? ` in ${source}` : '';
  const ctx = [
    stage ? `stage: ${stage}` : '',
    release ? `release: ${release}` : '',
    `ref: ${ref}`,
  ].filter(Boolean).join(' | ');

  const subject =
    trigger === 'new-group'
      ? `[vecini.online] New error group: ${name}${loc}`
      : `[vecini.online] Error spike (${recentCount ?? '?'}/h): ${name}${loc}`;

  const body =
    trigger === 'new-group'
      ? `New error group seen for the first time.\n\n${name}${loc}\n${message}\n\n${ctx}`
      : `Error spike: ${recentCount ?? '?'} occurrences in the last hour.\n\n${name}${loc}\n${message}\n\n${ctx}`;

  const html = `<pre style="font-family:monospace;font-size:13px;white-space:pre-wrap">${escapeHtml(body)}</pre>`;
  return { subject, text: body, html };
}
