// Netlify Function: scheduled health probe (T261).
//
// Invoked every 5 minutes by Netlify's scheduler (see netlify.toml).
// Probes the public health endpoint and runs a lightweight Supabase
// round-trip; anomalies are written to platform_error_reports and
// emailed to PLATFORM_ALERT_EMAIL via _shared/resend.ts.
//
// No-op when Supabase is not configured (demo / local dev without keys).
// De-dup: in-memory per Lambda instance (same pattern as error-report.ts).
// A 30-minute window means at most 2 emails per hour during a sustained outage.

import { isSupabaseAdminConfigured, supabaseAdmin } from './_shared/supabaseAdmin';
import { isResendConfigured, sendEmail } from './_shared/resend';
import {
  evaluateProbeResult,
  shouldAlertProbe,
  buildHealthAlertEmail,
} from './_shared/healthProbeLogic';

const HEALTH_TIMEOUT_MS = 5_000;
const DEDUP_WINDOW_MS = 30 * 60_000;

let _lastAlertAt: number | null = null;

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return new Response(null, { status: 405 });
  }

  if (!isSupabaseAdminConfigured()) {
    return new Response(null, { status: 204 });
  }

  const stage = process.env.VITE_APP_STAGE ?? 'prod';
  const siteUrl = (process.env.URL ?? '').replace(/\/$/, '');
  const release = process.env.COMMIT_REF?.slice(0, 40) ?? undefined;
  const now = Date.now();

  // -- 1. Probe the health endpoint --
  let healthStatus: number | null = null;
  let healthMs: number | null = null;

  if (siteUrl) {
    try {
      const t0 = Date.now();
      const res = await fetch(`${siteUrl}/.netlify/functions/health`, {
        signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
      });
      healthMs = Date.now() - t0;
      healthStatus = res.status;
    } catch {
      // Timeout or network failure — healthStatus stays null.
      healthMs = HEALTH_TIMEOUT_MS;
    }
  } else {
    // No site URL (preview / local) — skip HTTP probe, treat as ok.
    healthStatus = 200;
    healthMs = 0;
  }

  // -- 2. Supabase round-trip --
  let dbOk = false;
  try {
    const { error } = await supabaseAdmin()
      .from('asociatii')
      .select('id', { count: 'exact', head: true })
      .limit(1);
    dbOk = !error;
  } catch {
    dbOk = false;
  }

  const result = evaluateProbeResult({ healthStatus, healthMs, dbOk, healthTimeoutMs: HEALTH_TIMEOUT_MS });

  if (result.healthy) {
    _lastAlertAt = null;
    return new Response(
      JSON.stringify({ status: 'ok', probeMs: result.probeMs }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // -- 3. Record anomaly in platform_error_reports --
  const ref = `HPRB-${now.toString(36).slice(-6).toUpperCase()}`;
  try {
    await supabaseAdmin()
      .from('platform_error_reports')
      .insert({
        ref,
        name: 'HealthProbeFailure',
        message: result.reason,
        source: 'health-probe',
        at: now,
        stage,
        release: release ?? null,
        extra: { outcome: result.outcome, probeMs: result.probeMs ?? null },
      });
  } catch {
    // Non-fatal: alert path below is independent.
  }

  // -- 4. Email alert (de-duped per Lambda instance) --
  const alertEmail = process.env.PLATFORM_ALERT_EMAIL ?? process.env.RESEND_FROM_EMAIL;
  if (
    alertEmail &&
    isResendConfigured() &&
    shouldAlertProbe(_lastAlertAt, now, DEDUP_WINDOW_MS)
  ) {
    _lastAlertAt = now;
    const email = buildHealthAlertEmail({
      outcome: result.outcome,
      reason: result.reason,
      stage,
      probeMs: result.probeMs,
    });
    await sendEmail({ to: alertEmail, ...email }).catch(() => {});
  }

  return new Response(
    JSON.stringify({ status: 'anomaly', outcome: result.outcome }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
};
