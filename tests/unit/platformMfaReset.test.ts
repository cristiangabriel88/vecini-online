import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { checkMfaResetRateLimit, checkSlidingWindow } from '../../netlify/functions/_shared/rateLimiter';

// ── Source security contract ─────────────────────────────────────────────────

describe('platform-reset-user-mfa security contract', () => {
  const src = readFileSync(
    resolve(process.cwd(), 'netlify/functions/platform-reset-user-mfa.ts'),
    'utf8',
  );

  it('POST only -- rejects non-POST with 405', () => {
    expect(src).toContain('405');
    expect(src).toContain("method !== 'POST'");
  });

  it('checks backend is configured before acting', () => {
    expect(src).toContain('isSupabaseAdminConfigured');
    expect(src).toContain('503');
  });

  it('verifies the bearer token server-side', () => {
    expect(src).toContain('verifyBearerToken');
    expect(src).toContain('401');
  });

  it('re-checks platform_admins membership before acting', () => {
    expect(src).toContain('platform_admins');
    expect(src).toContain('403');
  });

  it('applies the MFA reset rate limit', () => {
    expect(src).toContain('checkMfaResetRateLimit');
    expect(src).toContain('429');
  });

  it('returns 404 when no user is found for the given email', () => {
    expect(src).toContain('404');
    expect(src).toContain('not-found');
  });

  it('deletes TOTP factors via auth.admin.mfa.deleteFactor', () => {
    expect(src).toContain('deleteFactor');
  });

  it('deletes from mfa_channels by user_id', () => {
    expect(src).toContain("'mfa_channels'");
    expect(src).toContain('user_id');
  });

  it('deletes from mfa_recovery_codes by user_id', () => {
    expect(src).toContain("'mfa_recovery_codes'");
  });

  it('deletes from session_elevations by user_id', () => {
    expect(src).toContain("'session_elevations'");
  });

  it('audits the reset into the tamper-evident chain', () => {
    expect(src).toContain('appendAudit');
    expect(src).toContain("'platform.mfa_reset'");
  });

  it('never logs or returns the user email verbatim -- uses maskEmail', () => {
    expect(src).toContain('maskEmail');
  });

  it('returns 200 { ok: true } on success', () => {
    expect(src).toContain('{ ok: true }');
    expect(src).toContain('200');
  });
});

// ── checkMfaResetRateLimit ───────────────────────────────────────────────────

describe('checkMfaResetRateLimit', () => {
  it('allows the first 5 resets within an hour', () => {
    const store = new Map();
    const now = 1_000_000;
    const window = 60 * 60_000;
    for (let i = 0; i < 5; i++) {
      expect(checkSlidingWindow(store, 'op-1', now + i, window, 5)).toBe(true);
    }
  });

  it('rejects the 6th reset within the same hour', () => {
    const store = new Map();
    const now = 1_000_000;
    const window = 60 * 60_000;
    for (let i = 0; i < 5; i++) {
      checkSlidingWindow(store, 'op-1', now + i, window, 5);
    }
    expect(checkSlidingWindow(store, 'op-1', now + 5, window, 5)).toBe(false);
  });

  it('allows again after the window expires', () => {
    const store = new Map();
    const window = 60 * 60_000;
    const now = 2_000_000;
    for (let i = 0; i < 5; i++) {
      checkSlidingWindow(store, 'op-1', now + i, window, 5);
    }
    // After the full window has elapsed, the old timestamps are outside the window.
    expect(checkSlidingWindow(store, 'op-1', now + window + 1, window, 5)).toBe(true);
  });

  it('each operator has an independent bucket', () => {
    const store = new Map();
    const now = 3_000_000;
    const window = 60 * 60_000;
    for (let i = 0; i < 5; i++) {
      checkSlidingWindow(store, 'op-A', now + i, window, 5);
    }
    // op-A is exhausted; op-B is still fresh.
    expect(checkSlidingWindow(store, 'op-B', now + 10, window, 5)).toBe(true);
  });

  it('is exported from rateLimiter.ts and callable', () => {
    expect(typeof checkMfaResetRateLimit).toBe('function');
    expect(checkMfaResetRateLimit('op-test-isolated-' + Math.random())).toBe(true);
  });
});

// ── Audit action registered ──────────────────────────────────────────────────

describe('platform.mfa_reset audit action', () => {
  it('is listed in AUDIT_ACTIONS', async () => {
    const { AUDIT_ACTIONS } = await import('../../src/features/audit/auditLogic');
    expect(AUDIT_ACTIONS).toContain('platform.mfa_reset');
  });
});
