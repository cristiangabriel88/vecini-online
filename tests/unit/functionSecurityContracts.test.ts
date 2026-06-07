import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// T291: Handler-level security contract tests for the highest-risk Netlify functions.
// These tests use static source analysis to assert the security model described in each
// function's header comment is actually present in the code -- bearer auth, platform-admin
// check, cross-tenant ownership check, and correct HTTP status codes for each rejection.
// They complement the existing gdprRetentionPurge.test.ts and netlifyRateLimits.test.ts.

function readFn(name: string): string {
  return readFileSync(resolve(process.cwd(), `netlify/functions/${name}`), 'utf8');
}

// ── gdpr-erasure ─────────────────────────────────────────────────────────────

describe('gdpr-erasure security contract', () => {
  const src = readFn('gdpr-erasure.ts');

  it('imports verifyBearerToken', () => {
    expect(src).toContain('verifyBearerToken');
  });

  it('imports isAdminOfAsociatie for cross-tenant ownership check', () => {
    expect(src).toContain('isAdminOfAsociatie');
  });

  it('rejects unauthenticated callers with 401', () => {
    expect(src).toContain('401');
    expect(src).toContain("'unauthorized'");
  });

  it('rejects callers who are not admin of the target asociatie with 403', () => {
    expect(src).toContain('403');
    expect(src).toContain("'forbidden'");
  });

  it('returns 405 for non-POST requests', () => {
    expect(src).toContain('405');
    expect(src).toContain("'method-not-allowed'");
  });

  it('returns 503 when backend is not configured', () => {
    expect(src).toContain('503');
    expect(src).toContain("'backend-not-configured'");
  });

  it('applies a rate limit per caller uid', () => {
    expect(src).toContain('checkSlidingWindow');
  });

  it('returns 429 when rate-limited', () => {
    expect(src).toContain('429');
    expect(src).toContain("'rate-limited'");
  });

  it('resolves the DSR server-side from the DB, never trusts client-supplied ids', () => {
    expect(src).toContain("from('data_subject_requests')");
    expect(src).toContain('.select(');
  });

  it('uses the service-role client (supabaseAdmin) for all writes', () => {
    expect(src).toContain('supabaseAdmin');
  });
});

// ── revoke-admin-access ───────────────────────────────────────────────────────

describe('revoke-admin-access security contract', () => {
  const src = readFn('revoke-admin-access.ts');

  it('imports verifyBearerToken', () => {
    expect(src).toContain('verifyBearerToken');
  });

  it('re-checks platform_admins server-side (never trusts client-supplied role)', () => {
    expect(src).toContain("from('platform_admins')");
  });

  it('rejects unauthenticated callers with 401', () => {
    expect(src).toContain('401');
    expect(src).toContain("'unauthorized'");
  });

  it('rejects non-platform-admins with 403', () => {
    expect(src).toContain('403');
    expect(src).toContain("'forbidden'");
  });

  it('returns 405 for non-POST requests', () => {
    expect(src).toContain('405');
    expect(src).toContain("'method-not-allowed'");
  });

  it('returns 503 when backend is not configured', () => {
    expect(src).toContain('503');
    expect(src).toContain("'backend-not-configured'");
  });

  it('validates email format server-side', () => {
    expect(src).toContain('EMAIL_RE');
    expect(src).toContain('422');
    expect(src).toContain("'validation-failed'");
  });

  it('resolves the target user by email via auth admin API (never trusts client-supplied userId)', () => {
    expect(src).toContain('listUsers');
  });

  it('appends to the audit chain on success', () => {
    expect(src).toContain('appendAudit');
    expect(src).toContain("'admin.access_revoked'");
  });

  it('uses the service-role client for all DB operations', () => {
    expect(src).toContain('supabaseAdmin');
  });
});

// ── feature-override ──────────────────────────────────────────────────────────

describe('feature-override security contract', () => {
  const src = readFn('feature-override.ts');

  it('imports verifyBearerToken', () => {
    expect(src).toContain('verifyBearerToken');
  });

  it('re-checks platform_admins server-side', () => {
    expect(src).toContain("from('platform_admins')");
  });

  it('rejects unauthenticated callers with 401', () => {
    expect(src).toContain('401');
    expect(src).toContain("'unauthorized'");
  });

  it('rejects non-platform-admins with 403', () => {
    expect(src).toContain('403');
    expect(src).toContain("'forbidden'");
  });

  it('returns 405 for non-POST requests', () => {
    expect(src).toContain('405');
    expect(src).toContain("'method-not-allowed'");
  });

  it('returns 503 when backend is not configured', () => {
    expect(src).toContain('503');
    expect(src).toContain("'backend-not-configured'");
  });

  it('validates all required payload fields server-side', () => {
    expect(src).toContain('422');
    expect(src).toContain("'validation-failed'");
    expect(src).toContain("'asociatieId'");
    expect(src).toContain("'featureKey'");
  });

  it('verifies the target asociatie exists before applying override', () => {
    expect(src).toContain("from('asociatii')");
    expect(src).toContain('404');
  });

  it('appends to the audit chain on success', () => {
    expect(src).toContain('appendAudit');
    expect(src).toContain("'feature.override_enabled'");
  });

  it('uses the service-role client for all DB operations', () => {
    expect(src).toContain('supabaseAdmin');
  });
});

// ── billing-checkout ──────────────────────────────────────────────────────────

describe('billing-checkout security contract', () => {
  const src = readFn('billing-checkout.ts');

  it('imports verifyBearerToken', () => {
    expect(src).toContain('verifyBearerToken');
  });

  it('verifies caller is admin/presedinte of the target asociatie (cross-tenant ownership check)', () => {
    expect(src).toContain("from('memberships')");
    expect(src).toContain("'admin', 'presedinte'");
  });

  it('rejects unauthenticated callers with 401', () => {
    expect(src).toContain('401');
    expect(src).toContain("'unauthorized'");
  });

  it('rejects callers who are not admin of the target asociatie with 403', () => {
    expect(src).toContain('403');
    expect(src).toContain("'forbidden'");
  });

  it('returns 405 for non-POST requests', () => {
    expect(src).toContain('405');
    expect(src).toContain("'method-not-allowed'");
  });

  it('returns 503 when backend is not configured', () => {
    expect(src).toContain('503');
    expect(src).toContain("'backend-not-configured'");
  });

  it('validates plan_id against an allowlist (no arbitrary plan ids accepted)', () => {
    expect(src).toContain('VALID_PLAN_IDS');
    expect(src).toContain('422');
    expect(src).toContain("'invalid-plan_id'");
  });

  it('validates that asociatie_id is present', () => {
    expect(src).toContain("'asociatie_id required'");
  });

  it('uses the service-role client for all DB operations', () => {
    expect(src).toContain('supabaseAdmin');
  });
});
