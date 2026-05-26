import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { checkSlidingWindow } from '../../netlify/functions/_shared/rateLimiter';

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
