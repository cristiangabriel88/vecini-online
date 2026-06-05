// Netlify Function: HMAC-SHA256 signing of the audit chain tail (T87).
//
// Signs the chain head hash with a server-held secret (AUDIT_HMAC_SECRET) so
// that a party who can write to audit_log and recompute cyrb53 hashes cannot
// also forge a valid HMAC without the secret. The three tamper-evidence layers:
//
//   1. Append-only RLS        -- no update/delete granted to anyone.
//   2. cyrb53 chain links     -- detects accidental edits/reorders via verifyChain.
//   3. HMAC-SHA256 (this fn)  -- cryptographic; forgery requires the server secret.
//
// Recommended external anchoring (future follow-up): periodically publish the
// HMAC to an append-only out-of-band store (email digest, trusted log service)
// so the chain tail is verifiable even if both the DB and the secret are later
// replaced.
//
// HTTP:
//   POST only; bearer auth required (admin or presedinte of the asociatie).
//   400  missing-fields / invalid-tail-hash (must be 16 lower-case hex chars)
//   401  unauthorized
//   403  forbidden (not an admin of the given asociatie)
//   405  method-not-allowed
//   429  rate limited
//   200  { hmac: string, algorithm: 'hmac-sha256' }   -- when AUDIT_HMAC_SECRET is set
//   200  { hmac: null, configured: false }             -- when AUDIT_HMAC_SECRET is absent
//
// Activation:
//   Set AUDIT_HMAC_SECRET to a 32+ byte random hex string in Netlify env vars.
//   Example: openssl rand -hex 32
//   The secret must never appear in logs, version control, or API responses.
//
// Rate limit: 60 requests / 60 s per IP.
// Privacy: no user data is hashed; only the asociatie id and chain tail hash.

import { createHmac } from 'crypto';
import { checkSlidingWindow } from './_shared/rateLimiter';
import { verifyBearerToken, isAdminOfAsociatie } from './_shared/supabaseAdmin';

const _ipStore = new Map<string, { timestamps: number[] }>();
const WINDOW_MS = 60_000;
const MAX_PER_IP = 60;

// Mirrors hmacCanonical() in auditLogic.ts. Defined inline to avoid pulling in
// the papaparse import that auditLogic.ts carries for CSV export.
function hmacCanonical(asociatieId: string, tailHash: string): string {
  return `v1:${asociatieId}:${tailHash}`;
}

// A tail hash from cyrb53 is always exactly 16 lower-case hex characters.
const TAIL_HASH_RE = /^[0-9a-f]{16}$/;

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

interface HmacPayload {
  asociatie_id?: unknown;
  tail_hash?: unknown;
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return json(405, { error: 'method-not-allowed' });

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '';
  if (ip && !checkSlidingWindow(_ipStore, ip, Date.now(), WINDOW_MS, MAX_PER_IP)) {
    return new Response(null, { status: 429, headers: { 'Retry-After': '60' } });
  }

  const { userId, error: authError } = await verifyBearerToken(req.headers.get('Authorization'));
  if (!userId) return json(401, { error: authError ?? 'unauthorized' });

  let payload: HmacPayload;
  try {
    payload = (await req.json()) as HmacPayload;
  } catch {
    return json(400, { error: 'invalid-json' });
  }

  if (typeof payload.asociatie_id !== 'string' || !payload.asociatie_id) {
    return json(400, { error: 'missing-fields' });
  }
  if (typeof payload.tail_hash !== 'string' || !TAIL_HASH_RE.test(payload.tail_hash)) {
    return json(400, { error: 'invalid-tail-hash' });
  }

  const isAdmin = await isAdminOfAsociatie(userId, payload.asociatie_id);
  if (!isAdmin) return json(403, { error: 'forbidden' });

  const secret = process.env.AUDIT_HMAC_SECRET;
  if (!secret) return json(200, { hmac: null, configured: false });

  const hmac = createHmac('sha256', secret)
    .update(hmacCanonical(payload.asociatie_id, payload.tail_hash))
    .digest('hex');

  return json(200, { hmac, algorithm: 'hmac-sha256' });
};
