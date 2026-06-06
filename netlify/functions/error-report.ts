// Netlify Function: receive and log scrubbed client error reports (T82/T96).
//
// The client errorReporting module scrubs all PII before building a report, so
// by the time a payload reaches this endpoint message and stack are already
// clean. Logs structural metadata (ref, name, source, at) to the function log.
// When Supabase is configured, also persists the full scrubbed report to
// platform_error_reports so the superadmin error feed (T96) can surface it.
//
// Rate-limited: 20 reports per 10 minutes per IP (in-memory, per Lambda
// instance). Body capped at 4 KB to prevent abuse.
//
// Always responds 204 so the client never retries or waits for a result.

import { checkSlidingWindow } from './_shared/rateLimiter';
import { isSupabaseAdminConfigured, supabaseAdmin } from './_shared/supabaseAdmin';
import { isResendConfigured, sendEmail } from './_shared/resend';
import {
  buildAlertEmail,
  shouldAlertNewGroup,
  shouldAlertSpike,
} from './_shared/errorAlertLogic';

const _ipStore = new Map<string, { timestamps: number[] }>();
const IP_WINDOW_MS = 10 * 60 * 1000;
const IP_MAX = 20;

// Alert de-dup: per group key, tracks the last time an alert was sent.
// Per-Lambda-instance (in-memory), same pattern as rate limiter.
const _alertStore = new Map<string, number>();
const SPIKE_THRESHOLD = 10;
const SPIKE_WINDOW_MS = 3_600_000;      // 1 hour
const DEDUP_WINDOW_MS = 4 * 3_600_000; // 4 hours
// Increased from 4 KB to allow a full scrubbed stack trace alongside the
// other report fields (T258b).
const MAX_BODY_BYTES = 16384;

async function checkAndAlert(
  name: string,
  source: string | undefined,
  message: string,
  stage: string | undefined,
  release: string | undefined,
  ref: string,
  at: number,
): Promise<void> {
  if (!isSupabaseAdminConfigured()) return;
  const alertEmail =
    process.env.PLATFORM_ALERT_EMAIL ?? process.env.RESEND_FROM_EMAIL;
  if (!alertEmail) return;

  const groupKey = `${name}:${source ?? ''}`;
  const lastAlertAt = _alertStore.get(groupKey) ?? null;

  // Count all rows for this group (new-group check)
  const totalResult = await (source !== undefined
    ? supabaseAdmin()
        .from('platform_error_reports')
        .select('*', { count: 'exact', head: true })
        .eq('name', name)
        .eq('source', source)
    : supabaseAdmin()
        .from('platform_error_reports')
        .select('*', { count: 'exact', head: true })
        .eq('name', name)
        .is('source', null));

  // Count rows in the last hour (spike check)
  const recentResult = await (source !== undefined
    ? supabaseAdmin()
        .from('platform_error_reports')
        .select('*', { count: 'exact', head: true })
        .eq('name', name)
        .eq('source', source)
        .gte('at', at - SPIKE_WINDOW_MS)
    : supabaseAdmin()
        .from('platform_error_reports')
        .select('*', { count: 'exact', head: true })
        .eq('name', name)
        .is('source', null)
        .gte('at', at - SPIKE_WINDOW_MS));

  const totalCount = totalResult.count ?? 0;
  const recentCount = recentResult.count ?? 0;
  const isNew = totalCount <= 1;

  let trigger: 'new-group' | 'spike' | null = null;
  if (isNew && shouldAlertNewGroup(lastAlertAt, at, DEDUP_WINDOW_MS)) {
    trigger = 'new-group';
  } else if (
    !isNew &&
    shouldAlertSpike(recentCount, SPIKE_THRESHOLD, lastAlertAt, at, DEDUP_WINDOW_MS)
  ) {
    trigger = 'spike';
  }

  if (!trigger) return;
  if (!isResendConfigured()) return;

  _alertStore.set(groupKey, at);
  const email = buildAlertEmail({
    trigger,
    name,
    source,
    message,
    stage,
    release,
    ref,
    recentCount,
  });
  await sendEmail({ to: alertEmail, ...email });
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') {
    return new Response(null, { status: 405 });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '';
  if (ip && !checkSlidingWindow(_ipStore, ip, Date.now(), IP_WINDOW_MS, IP_MAX)) {
    return new Response(null, { status: 429 });
  }

  try {
    const raw = await req.text();
    if (!raw || raw.length > MAX_BODY_BYTES) return new Response(null, { status: 204 });

    const report = JSON.parse(raw) as Record<string, unknown>;

    const safeRef = typeof report.ref === 'string' ? report.ref.slice(0, 20) : undefined;
    const safeName = typeof report.name === 'string' ? report.name.slice(0, 128) : undefined;
    const safeMessage = typeof report.message === 'string' ? report.message.slice(0, 1024) : undefined;
    const safeSource = typeof report.source === 'string' ? report.source.slice(0, 128) : undefined;
    const safeExtra = report.extra != null && typeof report.extra === 'object' && !Array.isArray(report.extra)
      ? report.extra as Record<string, unknown>
      : undefined;
    const safeAt = typeof report.at === 'number' ? report.at : undefined;
    const safeRelease = typeof report.release === 'string' ? report.release.slice(0, 40) : undefined;
    const safeStage = typeof report.stage === 'string' ? report.stage.slice(0, 16) : undefined;
    const safeStack = typeof report.stack === 'string' ? report.stack.slice(0, 8192) : undefined;

    console.info('[error-report]', { ref: safeRef, name: safeName, source: safeSource, at: safeAt, release: safeRelease, stage: safeStage });

    if (safeRef && safeName && safeMessage && safeAt && isSupabaseAdminConfigured()) {
      await supabaseAdmin()
        .from('platform_error_reports')
        .insert({
          ref: safeRef,
          name: safeName,
          message: safeMessage,
          source: safeSource ?? null,
          extra: safeExtra ?? null,
          at: safeAt,
          release: safeRelease ?? null,
          stage: safeStage ?? null,
          stack: safeStack ?? null,
        });
      await checkAndAlert(
        safeName,
        safeSource,
        safeMessage,
        safeStage,
        safeRelease,
        safeRef,
        safeAt,
      ).catch(() => {});
    }
  } catch {
    // malformed body or DB error -- never block the response
  }

  return new Response(null, { status: 204 });
};
