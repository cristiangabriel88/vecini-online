// Netlify Function: on-demand symbolication of minified stack traces (T258b).
//
// Fetches the matching source map from the private Supabase Storage bucket
// "source-maps/<release>/<filename>.js.map" and resolves each frame back to
// the original file:line:col using source-map-js (pure JS, no WASM).
//
// Security model:
//  - POST only.
//  - Requires isSupabaseAdminConfigured().
//  - Caller resolved via verifyBearerToken(); must be in platform_admins.
//  - Source maps served from the private bucket via service-role key -- never
//    exposed to the client raw.
//
// HTTP responses:
//  405  method-not-allowed
//  503  backend-not-configured
//  401  unauthorized
//  403  forbidden
//  400  invalid-json / validation-failed
//  200  { frames: ResolvedFrame[] }
//
// Privacy: frame strings are already scrubbed by the client before reporting.

import { SourceMapConsumer, type RawSourceMap } from 'source-map-js';
import {
  isSupabaseAdminConfigured,
  supabaseAdmin,
  verifyBearerToken,
} from './_shared/supabaseAdmin';
import { parseMinifiedFrame, extractFilename } from '../../src/shared/lib/sourcemapUtils';

const BUCKET = 'source-maps';
const MAX_BODY_BYTES = 65536;
const MAX_FRAMES = 50;

interface ResolvedFrame {
  source: string | null;
  line: number | null;
  col: number | null;
  name: string | null;
  raw: string;
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return json(405, { error: 'method-not-allowed' });
  if (!isSupabaseAdminConfigured()) return json(503, { error: 'backend-not-configured' });

  const { userId, error: authError } = await verifyBearerToken(
    req.headers.get('Authorization'),
  );
  if (!userId) return json(401, { error: authError ?? 'unauthorized' });

  const db = supabaseAdmin();
  const { data: adminRow } = await db
    .from('platform_admins')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (!adminRow) return json(403, { error: 'forbidden' });

  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return json(400, { error: 'invalid-json' });
  }
  if (!raw || raw.length > MAX_BODY_BYTES) return json(400, { error: 'payload-too-large' });

  let payload: { stack?: unknown; release?: unknown };
  try {
    payload = JSON.parse(raw) as { stack?: unknown; release?: unknown };
  } catch {
    return json(400, { error: 'invalid-json' });
  }

  const stack = typeof payload.stack === 'string' ? payload.stack : '';
  const release = typeof payload.release === 'string' ? payload.release.trim().slice(0, 40) : '';
  if (!stack || !release) return json(400, { error: 'validation-failed' });

  const frameLines = stack
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('at ') || /^.+@.+:\d+:\d+$/.test(l))
    .slice(0, MAX_FRAMES);

  // Cache source map consumers for the same file within this invocation.
  const consumers = new Map<string, SourceMapConsumer | null>();

  async function getConsumer(filename: string): Promise<SourceMapConsumer | null> {
    if (consumers.has(filename)) return consumers.get(filename) ?? null;
    const path = `${release}/${filename}.map`;
    const { data, error } = await db.storage.from(BUCKET).download(path);
    if (error || !data) {
      consumers.set(filename, null);
      return null;
    }
    try {
      const text = await (data as Blob).text();
      const rawMap = JSON.parse(text) as RawSourceMap;
      const consumer = new SourceMapConsumer(rawMap);
      consumers.set(filename, consumer);
      return consumer;
    } catch {
      consumers.set(filename, null);
      return null;
    }
  }

  const resolved: ResolvedFrame[] = [];

  for (const line of frameLines) {
    const parsed = parseMinifiedFrame(line);
    if (!parsed) {
      resolved.push({ source: null, line: null, col: null, name: null, raw: line });
      continue;
    }
    const filename = extractFilename(parsed.file);
    const consumer = await getConsumer(filename);
    if (!consumer) {
      resolved.push({ source: null, line: null, col: null, name: null, raw: line });
      continue;
    }
    const pos = consumer.originalPositionFor({ line: parsed.line, column: parsed.col });
    resolved.push({
      source: pos.source ?? null,
      line: pos.line ?? null,
      col: pos.column ?? null,
      name: pos.name ?? null,
      raw: line,
    });
  }

  return json(200, { frames: resolved });
};
