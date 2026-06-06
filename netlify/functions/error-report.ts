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

const _ipStore = new Map<string, { timestamps: number[] }>();
const IP_WINDOW_MS = 10 * 60 * 1000;
const IP_MAX = 20;
const MAX_BODY_BYTES = 4096;

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
        });
    }
  } catch {
    // malformed body or DB error -- never block the response
  }

  return new Response(null, { status: 204 });
};
