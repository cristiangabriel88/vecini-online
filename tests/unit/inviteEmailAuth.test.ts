import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { checkSlidingWindow, checkIpRateLimit } from '../../netlify/functions/_shared/rateLimiter';
import { extractClientIp } from '../../netlify/functions/invite-email';

// ── Schema guard: invite_codes token column (T148) ───────────────────────────

const migrationsDir = join(process.cwd(), 'supabase', 'migrations');

function allMigrationSql(): string {
  return readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => readFileSync(join(migrationsDir, f), 'utf8'))
    .join('\n');
}

describe('invite_codes token column schema (T148)', () => {
  const sql = allMigrationSql().toLowerCase();

  it('adds a token column to invite_codes idempotently', () => {
    expect(sql).toContain('alter table invite_codes add column if not exists token text');
  });

  it('creates a unique index on token to prevent duplicate tokens', () => {
    expect(sql).toContain('create unique index');
    expect(sql).toContain('invite_codes_token_unique_idx');
    expect(sql).toContain('on invite_codes (token)');
  });

  it('drops the index idempotently before (re)creating it', () => {
    expect(sql).toContain('drop index if exists invite_codes_token_unique_idx');
  });
});

// ── Pure rate-limiter logic (T148) ───────────────────────────────────────────

describe('checkSlidingWindow', () => {
  function makeStore(): Map<string, { timestamps: number[] }> {
    return new Map();
  }

  it('allows requests up to the max count within the window', () => {
    const store = makeStore();
    const now = 1_000_000;
    // 3 requests within a 60-second window, max 3
    expect(checkSlidingWindow(store, 'k', now, 60_000, 3)).toBe(true);
    expect(checkSlidingWindow(store, 'k', now + 1000, 60_000, 3)).toBe(true);
    expect(checkSlidingWindow(store, 'k', now + 2000, 60_000, 3)).toBe(true);
    // 4th request exceeds the limit
    expect(checkSlidingWindow(store, 'k', now + 3000, 60_000, 3)).toBe(false);
  });

  it('allows requests again after the window expires', () => {
    const store = makeStore();
    const now = 1_000_000;
    // Fill the window
    checkSlidingWindow(store, 'k', now, 60_000, 2);
    checkSlidingWindow(store, 'k', now + 1000, 60_000, 2);
    // Window still active: blocked
    expect(checkSlidingWindow(store, 'k', now + 2000, 60_000, 2)).toBe(false);
    // After the window expires, requests are allowed again
    expect(checkSlidingWindow(store, 'k', now + 61_000, 60_000, 2)).toBe(true);
  });

  it('counts each key independently', () => {
    const store = makeStore();
    const now = 1_000_000;
    checkSlidingWindow(store, 'a', now, 60_000, 1);
    // Key 'a' is exhausted
    expect(checkSlidingWindow(store, 'a', now + 100, 60_000, 1)).toBe(false);
    // Key 'b' is unaffected
    expect(checkSlidingWindow(store, 'b', now + 100, 60_000, 1)).toBe(true);
  });

  it('evicts expired timestamps on every call', () => {
    const store = makeStore();
    const now = 1_000_000;
    // Record 3 requests in the first window
    checkSlidingWindow(store, 'k', now, 60_000, 5);
    checkSlidingWindow(store, 'k', now + 1000, 60_000, 5);
    checkSlidingWindow(store, 'k', now + 2000, 60_000, 5);
    // Advance 2 full windows so all three are expired
    const later = now + 120_001;
    // Only 1 new request should be in the store now
    checkSlidingWindow(store, 'k', later, 60_000, 5);
    const entry = store.get('k')!;
    // Only the timestamp from `later` survives
    expect(entry.timestamps).toHaveLength(1);
    expect(entry.timestamps[0]).toBe(later);
  });

  it('a very short window blocks requests that land within it', () => {
    const store = makeStore();
    // Window of 10 ms, max 1 request.
    expect(checkSlidingWindow(store, 'k', 1000, 10, 1)).toBe(true);
    // Second request 5 ms later -- still inside the window.
    expect(checkSlidingWindow(store, 'k', 1005, 10, 1)).toBe(false);
    // Request outside the window is allowed.
    expect(checkSlidingWindow(store, 'k', 1011, 10, 1)).toBe(true);
  });
});

// ── Per-IP rate limiter (T181) ────────────────────────────────────────────────

describe('checkIpRateLimit', () => {
  it('allows the first 5 sends from the same IP within 60 seconds', () => {
    const t = 2_000_000;
    for (let i = 0; i < 5; i++) {
      expect(checkIpRateLimit('1.2.3.4', t + i * 100)).toBe(true);
    }
  });

  it('blocks the 6th send from the same IP within 60 seconds', () => {
    const t = 3_000_000;
    for (let i = 0; i < 5; i++) checkIpRateLimit('5.6.7.8', t + i * 100);
    expect(checkIpRateLimit('5.6.7.8', t + 600)).toBe(false);
  });

  it('does not affect a different IP', () => {
    const t = 4_000_000;
    for (let i = 0; i < 5; i++) checkIpRateLimit('9.9.9.9', t + i * 100);
    // 9.9.9.9 is exhausted, but 10.10.10.10 should be unaffected
    expect(checkIpRateLimit('10.10.10.10', t + 600)).toBe(true);
  });

  it('recovers after the 60-second window expires', () => {
    const t = 5_000_000;
    for (let i = 0; i < 5; i++) checkIpRateLimit('11.0.0.1', t + i * 100);
    expect(checkIpRateLimit('11.0.0.1', t + 60_001)).toBe(true);
  });
});

// ── extractClientIp wiring (T181) ─────────────────────────────────────────────

describe('extractClientIp', () => {
  function makeReq(headers: Record<string, string>): Request {
    return new Request('https://example.com', { method: 'POST', headers });
  }

  it('extracts the first IP from x-forwarded-for', () => {
    const req = makeReq({ 'x-forwarded-for': '203.0.113.5, 10.0.0.1' });
    expect(extractClientIp(req)).toBe('203.0.113.5');
  });

  it('falls back to x-real-ip when x-forwarded-for is absent', () => {
    const req = makeReq({ 'x-real-ip': '198.51.100.7' });
    expect(extractClientIp(req)).toBe('198.51.100.7');
  });

  it('returns null when no IP headers are present', () => {
    const req = makeReq({});
    expect(extractClientIp(req)).toBeNull();
  });

  it('returns null for a blank x-forwarded-for value', () => {
    const req = makeReq({ 'x-forwarded-for': '  ' });
    expect(extractClientIp(req)).toBeNull();
  });
});

// ── Wiring guard (T181) ───────────────────────────────────────────────────────

describe('invite-email.ts rate-limit wiring (T181)', () => {
  const src = readFileSync(
    join(process.cwd(), 'netlify/functions/invite-email.ts'),
    'utf8',
  );

  it('imports checkIpRateLimit from rateLimiter', () => {
    expect(src).toContain('checkIpRateLimit');
  });

  it('calls extractClientIp before the DB lookup', () => {
    const ipPos = src.indexOf('extractClientIp(req)');
    // Find the actual call (not the import); 'await getInviteById' is unambiguous.
    const dbPos = src.indexOf('await getInviteById(');
    expect(ipPos).toBeGreaterThan(0);
    expect(dbPos).toBeGreaterThan(0);
    expect(ipPos).toBeLessThan(dbPos);
  });

  it('returns 429 when the IP limit is exceeded', () => {
    expect(src).toContain("!checkIpRateLimit(clientIp)");
    expect(src).toContain("json(429, { error: 'rate-limited' })");
  });
});
