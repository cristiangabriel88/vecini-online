// Netlify Function: health check endpoint (T229).
//
// GET-only, no auth required. Returns {"status":"ok","stage":"<stage>"} for
// uptime monitors (UptimeRobot, BetterUptime, etc.). The stage value comes
// from VITE_APP_STAGE (prod | dev | demo), defaulting to "prod" when absent.
//
// Rate-limited to 120 requests per 60 s per IP to prevent abuse.

import { checkSlidingWindow } from './_shared/rateLimiter';

const _ipStore = new Map<string, { timestamps: number[] }>();
const WINDOW_MS = 60_000;
const MAX = 120;

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'GET') {
    return new Response(null, { status: 405 });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '';
  if (ip && !checkSlidingWindow(_ipStore, ip, Date.now(), WINDOW_MS, MAX)) {
    return new Response(null, { status: 429, headers: { 'Retry-After': '60' } });
  }

  const stage = process.env.VITE_APP_STAGE ?? 'prod';
  const body = JSON.stringify({ status: 'ok', stage });
  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
