// Netlify Function: receive and log scrubbed client error reports (T82).
//
// The client errorReporting module scrubs all PII before building a report, so
// by the time a payload reaches this endpoint message and stack are already
// clean. This function logs only structural metadata (ref, name, source, at)
// and never the scrubbed text, so even anonymised error strings do not appear
// in operator logs.
//
// Rate-limited: 20 reports per 10 minutes per IP (in-memory, per Lambda
// instance). Body capped at 4 KB to prevent abuse.
//
// Always responds 204 so the client never retries or waits for a result.

import { checkSlidingWindow } from './_shared/rateLimiter';

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

    console.info('[error-report]', {
      ref: typeof report.ref === 'string' ? report.ref.slice(0, 20) : undefined,
      name: typeof report.name === 'string' ? report.name.slice(0, 64) : undefined,
      source: typeof report.source === 'string' ? report.source.slice(0, 64) : undefined,
      at: typeof report.at === 'number' ? report.at : undefined,
    });
  } catch {
    // malformed body -- ignore
  }

  return new Response(null, { status: 204 });
};
