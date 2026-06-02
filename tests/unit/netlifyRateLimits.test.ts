import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  checkCspReportRateLimit,
  checkNotifyEmailRateLimit,
  checkPvPdfRateLimit,
  checkProvisionRateLimit,
} from '../../netlify/functions/_shared/rateLimiter';

// ── Named rate-limiter helpers (T197) ─────────────────────────────────────────

describe('checkCspReportRateLimit', () => {
  it('allows up to 50 requests per 60 s', () => {
    const t = 10_000_000;
    for (let i = 0; i < 50; i++) {
      expect(checkCspReportRateLimit('csp-a', t + i)).toBe(true);
    }
  });

  it('blocks the 51st request in the same window', () => {
    const t = 11_000_000;
    for (let i = 0; i < 50; i++) checkCspReportRateLimit('csp-b', t + i);
    expect(checkCspReportRateLimit('csp-b', t + 50)).toBe(false);
  });

  it('recovers after the 60-second window', () => {
    const t = 12_000_000;
    for (let i = 0; i < 50; i++) checkCspReportRateLimit('csp-c', t + i);
    expect(checkCspReportRateLimit('csp-c', t + 60_001)).toBe(true);
  });
});

describe('checkNotifyEmailRateLimit', () => {
  it('allows up to 30 requests per 10 minutes', () => {
    const t = 20_000_000;
    for (let i = 0; i < 30; i++) {
      expect(checkNotifyEmailRateLimit('ne-uid-a', t + i * 1000)).toBe(true);
    }
  });

  it('blocks the 31st request in the same window', () => {
    const t = 21_000_000;
    for (let i = 0; i < 30; i++) checkNotifyEmailRateLimit('ne-uid-b', t + i * 1000);
    expect(checkNotifyEmailRateLimit('ne-uid-b', t + 30_000)).toBe(false);
  });

  it('recovers after the 10-minute window', () => {
    const t = 22_000_000;
    for (let i = 0; i < 30; i++) checkNotifyEmailRateLimit('ne-uid-c', t + i * 1000);
    expect(checkNotifyEmailRateLimit('ne-uid-c', t + 10 * 60_000 + 1)).toBe(true);
  });
});

describe('checkPvPdfRateLimit', () => {
  it('allows up to 5 requests per 60 s', () => {
    const t = 30_000_000;
    for (let i = 0; i < 5; i++) {
      expect(checkPvPdfRateLimit('pv-uid-a', t + i * 1000)).toBe(true);
    }
  });

  it('blocks the 6th request in the same window', () => {
    const t = 31_000_000;
    for (let i = 0; i < 5; i++) checkPvPdfRateLimit('pv-uid-b', t + i * 1000);
    expect(checkPvPdfRateLimit('pv-uid-b', t + 5_000)).toBe(false);
  });

  it('recovers after the 60-second window', () => {
    const t = 32_000_000;
    for (let i = 0; i < 5; i++) checkPvPdfRateLimit('pv-uid-c', t + i * 1000);
    expect(checkPvPdfRateLimit('pv-uid-c', t + 60_001)).toBe(true);
  });
});

describe('checkProvisionRateLimit', () => {
  it('allows up to 20 requests per 60 minutes', () => {
    const t = 40_000_000;
    for (let i = 0; i < 20; i++) {
      expect(checkProvisionRateLimit('prov-a', t + i * 1000)).toBe(true);
    }
  });

  it('blocks the 21st request in the same window', () => {
    const t = 41_000_000;
    for (let i = 0; i < 20; i++) checkProvisionRateLimit('prov-b', t + i * 1000);
    expect(checkProvisionRateLimit('prov-b', t + 20_000)).toBe(false);
  });

  it('recovers after the 60-minute window', () => {
    const t = 42_000_000;
    for (let i = 0; i < 20; i++) checkProvisionRateLimit('prov-c', t + i * 1000);
    expect(checkProvisionRateLimit('prov-c', t + 60 * 60_000 + 1)).toBe(true);
  });
});

// ── Static wiring guards (T197) ───────────────────────────────────────────────

describe('csp-report.ts rate-limit wiring', () => {
  const src = readFileSync(join(process.cwd(), 'netlify/functions/csp-report.ts'), 'utf8');

  it('imports checkCspReportRateLimit', () => {
    expect(src).toContain('checkCspReportRateLimit');
  });

  it('extracts client IP before reading body', () => {
    const ipPos = src.indexOf('x-forwarded-for');
    const bodyPos = src.indexOf('req.text()');
    expect(ipPos).toBeGreaterThan(0);
    expect(bodyPos).toBeGreaterThan(0);
    expect(ipPos).toBeLessThan(bodyPos);
  });

  it('returns 429 with Retry-After when rate-limited', () => {
    expect(src).toContain('status: 429');
    expect(src).toContain("'Retry-After'");
  });
});

describe('notify-email.ts rate-limit wiring', () => {
  const src = readFileSync(join(process.cwd(), 'netlify/functions/notify-email.ts'), 'utf8');

  it('imports checkNotifyEmailRateLimit', () => {
    expect(src).toContain('checkNotifyEmailRateLimit');
  });

  it('rate-limits after auth but before DB user lookup', () => {
    const rlPos = src.indexOf('checkNotifyEmailRateLimit');
    const dbPos = src.indexOf(".from('users')");
    expect(rlPos).toBeGreaterThan(0);
    expect(dbPos).toBeGreaterThan(0);
    expect(rlPos).toBeLessThan(dbPos);
  });

  it('returns 429 with Retry-After when rate-limited', () => {
    expect(src).toContain('status: 429');
    expect(src).toContain("'Retry-After'");
  });
});

describe('generate-pv-pdf.ts rate-limit wiring', () => {
  const src = readFileSync(join(process.cwd(), 'netlify/functions/generate-pv-pdf.ts'), 'utf8');

  it('imports checkPvPdfRateLimit', () => {
    expect(src).toContain('checkPvPdfRateLimit');
  });

  it('rate-limits after auth but before DB meeting lookup', () => {
    const rlPos = src.indexOf('checkPvPdfRateLimit');
    const dbPos = src.indexOf(".from('agas')");
    expect(rlPos).toBeGreaterThan(0);
    expect(dbPos).toBeGreaterThan(0);
    expect(rlPos).toBeLessThan(dbPos);
  });

  it('returns 429 with Retry-After when rate-limited', () => {
    expect(src).toContain('status: 429');
    expect(src).toContain("'Retry-After'");
  });
});

describe('provision-asociatie.ts rate-limit wiring', () => {
  const src = readFileSync(
    join(process.cwd(), 'netlify/functions/provision-asociatie.ts'),
    'utf8',
  );

  it('imports checkProvisionRateLimit', () => {
    expect(src).toContain('checkProvisionRateLimit');
  });

  it('extracts client IP before auth', () => {
    const ipPos = src.indexOf('x-forwarded-for');
    const authPos = src.indexOf('await verifyBearerToken');
    expect(ipPos).toBeGreaterThan(0);
    expect(authPos).toBeGreaterThan(0);
    expect(ipPos).toBeLessThan(authPos);
  });

  it('returns 429 with Retry-After when rate-limited', () => {
    expect(src).toContain('status: 429');
    expect(src).toContain("'Retry-After'");
  });
});
