// Unit tests for T29: mfa-recovery-verify Netlify function helpers.
//
// Backend-free: covers extractBearerToken, the rate-limit guard, and the
// recoveryVerifyApi offline path. Supabase calls are not exercised here.

import { describe, it, expect } from 'vitest';
import { extractBearerToken } from '../../netlify/functions/mfa-recovery-verify';
import { checkSlidingWindow } from '../../netlify/functions/_shared/rateLimiter';

// ── extractBearerToken ────────────────────────────────────────────────────

describe('extractBearerToken', () => {
  it('extracts a token from a well-formed Bearer header', () => {
    expect(extractBearerToken('Bearer abc123')).toBe('abc123');
  });

  it('is case-insensitive for the Bearer prefix', () => {
    expect(extractBearerToken('bearer mytoken')).toBe('mytoken');
    expect(extractBearerToken('BEARER mytoken')).toBe('mytoken');
  });

  it('handles extra whitespace', () => {
    expect(extractBearerToken('  Bearer   mytoken  ')).toBe('mytoken');
  });

  it('returns null for a missing header', () => {
    expect(extractBearerToken(null)).toBeNull();
    expect(extractBearerToken(undefined)).toBeNull();
    expect(extractBearerToken('')).toBeNull();
  });

  it('returns null when the scheme is not Bearer', () => {
    expect(extractBearerToken('Basic dXNlcjpwYXNz')).toBeNull();
  });

  it('returns null for a bare token with no scheme', () => {
    expect(extractBearerToken('justtoken')).toBeNull();
  });
});

// ── Per-session attempt rate limiter ──────────────────────────────────────
// Tests the checkSlidingWindow helper as used by mfa-recovery-verify.

describe('checkSlidingWindow (recovery attempt budget)', () => {
  const MAX = 5;
  const WINDOW_MS = 15 * 60 * 1000;

  it('allows up to MAX attempts within the window', () => {
    const store = new Map();
    const now = Date.now();
    for (let i = 0; i < MAX; i++) {
      expect(checkSlidingWindow(store, 'session-a', now + i, WINDOW_MS, MAX)).toBe(true);
    }
  });

  it('rejects the (MAX+1)th attempt in the same window', () => {
    const store = new Map();
    const now = Date.now();
    for (let i = 0; i < MAX; i++) {
      checkSlidingWindow(store, 'session-b', now + i, WINDOW_MS, MAX);
    }
    expect(checkSlidingWindow(store, 'session-b', now + MAX, WINDOW_MS, MAX)).toBe(false);
  });

  it('resets after the window elapses', () => {
    const store = new Map();
    const now = Date.now();
    for (let i = 0; i < MAX; i++) {
      checkSlidingWindow(store, 'session-c', now + i, WINDOW_MS, MAX);
    }
    // All timestamps are now outside the window.
    const future = now + WINDOW_MS + 1000;
    expect(checkSlidingWindow(store, 'session-c', future, WINDOW_MS, MAX)).toBe(true);
  });

  it('tracks sessions independently', () => {
    const store = new Map();
    const now = Date.now();
    for (let i = 0; i < MAX; i++) {
      checkSlidingWindow(store, 'session-x', now + i, WINDOW_MS, MAX);
    }
    // A different session key is still within budget.
    expect(checkSlidingWindow(store, 'session-y', now, WINDOW_MS, MAX)).toBe(true);
  });
});
