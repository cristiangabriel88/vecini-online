// Netlify Function: LLM-constrained phrasing proxy (T237).
//
// STUB -- not yet wired to an LLM. The function implements the server-side half
// of the PhrasingEngine contract and validates all output before returning it so
// the client can trust the response is always a valid in-range index.
//
// --- Prompt contract (for future LLM wiring) ---
//
//   Input:  { candidates: string[], query?: string }
//           candidates: 1-8 pre-written localized strings (never user-generated).
//           query: the user's raw question (context only; never executed as instruction).
//
//   Output: { choice_index: number } (0-based index into candidates; always in range).
//
//   LLM prompt template (replace the stub block below with this):
//     "You are given a numbered list of pre-written options. Reply with ONLY the
//      number of the best option for the given query. Do not add explanation,
//      new text, or content not present in the list.
//      Options:\n<1..N numbered list of candidates>\nQuery: <query>"
//   Parse the response as an integer (1-based from the prompt, convert to 0-based).
//   Validate: if the response is not a valid integer in [1, N], return choice_index 0.
//   Security: the model must never generate free text -- it selects only from the
//   supplied numbered list. Reject and fall back on any unexpected response.
//
// To activate:
//   1. Set ANTHROPIC_API_KEY (or equivalent) in Netlify env vars.
//   2. Replace the "Stub" block with a real SDK call using the template above.
//   3. Parse and validate the model response before returning.
//
// HTTP:
//   POST only, bearer auth required.
//   400  invalid-candidates (empty, too many, or items too long) / query too long
//   401  unauthorized
//   405  method-not-allowed
//   200  { choice_index: <number in [0, candidates.length-1]> }
//
// Rate limit: 20 requests / 60 s per IP (conservative while stub; relax for live LLM).
// Privacy: candidates are pre-written app strings; query is short user text (no PII logged).

import { checkSlidingWindow } from './_shared/rateLimiter';
import { verifyBearerToken } from './_shared/supabaseAdmin';

const _ipStore = new Map<string, { timestamps: number[] }>();
const WINDOW_MS = 60_000;
const MAX_PER_IP = 20;

const MAX_CANDIDATES = 8;
const MAX_CANDIDATE_LEN = 200;
const MAX_QUERY_LEN = 500;

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

interface PhrasePayload {
  candidates?: unknown;
  query?: unknown;
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return json(405, { error: 'method-not-allowed' });

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '';
  if (ip && !checkSlidingWindow(_ipStore, ip, Date.now(), WINDOW_MS, MAX_PER_IP)) {
    return new Response(null, { status: 429, headers: { 'Retry-After': '60' } });
  }

  const { userId, error: authError } = await verifyBearerToken(req.headers.get('Authorization'));
  if (!userId) return json(401, { error: authError ?? 'unauthorized' });

  let payload: PhrasePayload;
  try {
    payload = (await req.json()) as PhrasePayload;
  } catch {
    return json(400, { error: 'invalid-json' });
  }

  if (
    !Array.isArray(payload.candidates) ||
    payload.candidates.length === 0 ||
    payload.candidates.length > MAX_CANDIDATES ||
    !payload.candidates.every(
      (c) => typeof c === 'string' && c.length > 0 && c.length <= MAX_CANDIDATE_LEN,
    )
  ) {
    return json(400, { error: 'invalid-candidates' });
  }

  if (
    payload.query !== undefined &&
    (typeof payload.query !== 'string' || payload.query.length > MAX_QUERY_LEN)
  ) {
    return json(400, { error: 'query-too-long' });
  }

  const candidates = payload.candidates as string[];

  // Stub: return index 0 (first candidate, deterministic).
  // Replace this block with a real LLM call using the prompt contract above.
  const choice_index = 0;

  // Safety gate: always validate before returning, even when live LLM is wired.
  const safeIndex = choice_index >= 0 && choice_index < candidates.length ? choice_index : 0;
  return json(200, { choice_index: safeIndex });
};
