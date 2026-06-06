// Pure probe-evaluation logic for health-probe alerting (T261).
// No side effects; designed for unit testing in isolation.

export type ProbeOutcome = 'ok' | 'health-timeout' | 'health-error' | 'network-error' | 'db-error';

export interface ProbeResult {
  healthy: boolean;
  outcome: ProbeOutcome;
  /** Round-trip time in milliseconds, when measured. */
  probeMs?: number;
  reason: string;
}

/**
 * Evaluate raw probe measurements into a typed result.
 * Precedence: timeout > unreachable > non-200 > db failure > ok.
 */
export function evaluateProbeResult(params: {
  /** HTTP status returned by the health endpoint, or null when unreachable. */
  healthStatus: number | null;
  /** Round-trip time in ms, or null when the request never completed. */
  healthMs: number | null;
  /** True when the Supabase lightweight round-trip succeeded. */
  dbOk: boolean;
  /** Threshold above which the health probe is classified as a timeout. */
  healthTimeoutMs: number;
}): ProbeResult {
  const { healthStatus, healthMs, dbOk, healthTimeoutMs } = params;

  if (healthMs !== null && healthMs >= healthTimeoutMs) {
    return {
      healthy: false,
      outcome: 'health-timeout',
      probeMs: healthMs,
      reason: `health endpoint took ${healthMs}ms (limit ${healthTimeoutMs}ms)`,
    };
  }

  if (healthStatus === null) {
    return {
      healthy: false,
      outcome: 'network-error',
      probeMs: healthMs ?? undefined,
      reason: 'health endpoint unreachable',
    };
  }

  if (healthStatus !== 200) {
    return {
      healthy: false,
      outcome: 'health-error',
      probeMs: healthMs ?? undefined,
      reason: `health endpoint returned HTTP ${healthStatus}`,
    };
  }

  if (!dbOk) {
    return {
      healthy: false,
      outcome: 'db-error',
      probeMs: healthMs ?? undefined,
      reason: 'Supabase round-trip failed',
    };
  }

  return {
    healthy: true,
    outcome: 'ok',
    probeMs: healthMs ?? undefined,
    reason: 'all probes passed',
  };
}

/** True when a health alert should fire (respects the de-dup window). */
export function shouldAlertProbe(
  lastAlertAt: number | null,
  now: number,
  dedupWindowMs: number,
): boolean {
  if (lastAlertAt === null) return true;
  return now - lastAlertAt > dedupWindowMs;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Compose a plain-text and HTML alert email for ops internal use (English only). */
export function buildHealthAlertEmail(params: {
  outcome: ProbeOutcome;
  reason: string;
  stage?: string;
  probeMs?: number;
}): { subject: string; text: string; html: string } {
  const { outcome, reason, stage, probeMs } = params;
  const ctx = [
    stage ? `stage: ${stage}` : '',
    probeMs !== undefined ? `probe: ${probeMs}ms` : '',
  ]
    .filter(Boolean)
    .join(' | ');

  const subject = `[vecini.online] Health probe anomaly: ${outcome}`;
  const lines = [
    'Health probe anomaly detected.',
    '',
    `Outcome: ${outcome}`,
    `Reason:  ${reason}`,
    ...(ctx ? ['', ctx] : []),
  ];
  const text = lines.join('\n');
  const html = `<pre style="font-family:monospace;font-size:13px;white-space:pre-wrap">${escapeHtml(text)}</pre>`;
  return { subject, text, html };
}
