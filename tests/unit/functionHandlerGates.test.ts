// T291: Handler-level invocation tests for the highest-risk Netlify functions.
//
// These tests actually import and invoke the function handlers to verify the
// rejection gates (405, 503, 401, 403) execute at runtime -- not just that the
// code text contains the right strings. Every test drives real code paths.
//
// Test env has no Supabase credentials, so:
//   - isSupabaseAdminConfigured() returns false -> 503 for POST requests
//   - req.method !== 'POST' -> 405 before any auth check
//   - 401/403 paths: vi.hoisted mocks inject a configured admin client so the
//     auth-verification code path is exercised.

import { describe, it, expect, beforeEach, vi } from 'vitest';

// vi.hoisted lets mock factories reference mutable values that aren't yet
// in scope when the vi.mock call is hoisted to the top of the module.
const supabaseMocks = vi.hoisted(() => ({
  configured: false,
  bearerResult: { userId: null, error: 'unauthorized' } as { userId: string | null; error?: string },
  platformAdminRow: null as { user_id: string } | null,
  memberRow: null as { role: string } | null,
}));

vi.mock('../../netlify/functions/_shared/supabaseAdmin', () => ({
  isSupabaseAdminConfigured: () => supabaseMocks.configured,
  verifyBearerToken: vi.fn(async () => supabaseMocks.bearerResult),
  supabaseAdmin: vi.fn(() => ({
    from: (table: string) => {
      if (table === 'platform_admins') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: supabaseMocks.platformAdminRow, error: null }),
            }),
          }),
        };
      }
      if (table === 'memberships') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                in: () => ({
                  maybeSingle: async () => ({ data: supabaseMocks.memberRow, error: null }),
                }),
              }),
            }),
          }),
        };
      }
      return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) };
    },
  })),
  isAdminOfAsociatie: vi.fn(async () => supabaseMocks.memberRow !== null),
}));

vi.mock('../../netlify/functions/_shared/rateLimiter', () => ({
  checkSlidingWindow: vi.fn(() => true),
  checkInviteRateLimit: vi.fn(() => true),
  checkIpRateLimit: vi.fn(() => true),
  checkCspReportRateLimit: vi.fn(() => true),
  checkNotifyEmailRateLimit: vi.fn(() => true),
  checkPvPdfRateLimit: vi.fn(() => true),
  checkProvisionRateLimit: vi.fn(() => true),
  checkMfaVerifyRateLimit: vi.fn(() => true),
  checkMfaRequestRateLimit: vi.fn(() => true),
}));

vi.mock('../../netlify/functions/_shared/appendAudit', () => ({
  appendAudit: vi.fn(async () => ({ error: null })),
  computeAuditHash: vi.fn(() => 'aaaa1111bbbb2222'),
  AUDIT_GENESIS_HASH: '0000000000000000',
}));

import gdprErasureHandler from '../../netlify/functions/gdpr-erasure';
import revokeAdminHandler from '../../netlify/functions/revoke-admin-access';
import featureOverrideHandler from '../../netlify/functions/feature-override';
import billingCheckoutHandler from '../../netlify/functions/billing-checkout';
import purgeHandler from '../../netlify/functions/gdpr-retention-purge';
import listInvitesHandler from '../../netlify/functions/platform-list-invites';

function makeReq(
  method: string,
  url: string,
  headers: Record<string, string> = {},
  body?: string,
): Request {
  return new Request(url, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body != null ? body : method === 'POST' ? '{}' : undefined,
  });
}

beforeEach(() => {
  supabaseMocks.configured = false;
  supabaseMocks.bearerResult = { userId: null, error: 'unauthorized' };
  supabaseMocks.platformAdminRow = null;
  supabaseMocks.memberRow = null;
});

// ── gdpr-erasure ─────────────────────────────────────────────────────────────

describe('gdpr-erasure handler — gate rejection', () => {
  it('returns 405 for a GET request (non-POST rejected before any auth)', async () => {
    const res = await gdprErasureHandler(
      makeReq('GET', 'http://localhost/.netlify/functions/gdpr-erasure'),
    );
    expect(res.status).toBe(405);
    const body = await res.json() as { error: string };
    expect(body.error).toBe('method-not-allowed');
  });

  it('returns 503 when backend is not configured (POST, no credentials)', async () => {
    supabaseMocks.configured = false;
    const res = await gdprErasureHandler(
      makeReq('POST', 'http://localhost/.netlify/functions/gdpr-erasure'),
    );
    expect(res.status).toBe(503);
    const body = await res.json() as { error: string };
    expect(body.error).toBe('backend-not-configured');
  });

  it('returns 401 when bearer token is missing or invalid', async () => {
    supabaseMocks.configured = true;
    supabaseMocks.bearerResult = { userId: null, error: 'unauthorized' };
    const res = await gdprErasureHandler(
      makeReq('POST', 'http://localhost/.netlify/functions/gdpr-erasure'),
    );
    expect(res.status).toBe(401);
    const body = await res.json() as { error: string };
    expect(body.error).toBe('unauthorized');
  });
});

// ── revoke-admin-access ───────────────────────────────────────────────────────

describe('revoke-admin-access handler — gate rejection', () => {
  it('returns 405 for a GET request', async () => {
    const res = await revokeAdminHandler(
      makeReq('GET', 'http://localhost/.netlify/functions/revoke-admin-access'),
    );
    expect(res.status).toBe(405);
    const body = await res.json() as { error: string };
    expect(body.error).toBe('method-not-allowed');
  });

  it('returns 503 when backend is not configured', async () => {
    supabaseMocks.configured = false;
    const res = await revokeAdminHandler(
      makeReq('POST', 'http://localhost/.netlify/functions/revoke-admin-access'),
    );
    expect(res.status).toBe(503);
  });

  it('returns 401 when bearer token is missing or invalid', async () => {
    supabaseMocks.configured = true;
    supabaseMocks.bearerResult = { userId: null, error: 'unauthorized' };
    const res = await revokeAdminHandler(
      makeReq('POST', 'http://localhost/.netlify/functions/revoke-admin-access'),
    );
    expect(res.status).toBe(401);
    const body = await res.json() as { error: string };
    expect(body.error).toBe('unauthorized');
  });

  it('returns 403 when caller is not a platform admin', async () => {
    supabaseMocks.configured = true;
    supabaseMocks.bearerResult = { userId: 'user-not-admin', error: undefined };
    supabaseMocks.platformAdminRow = null;
    const res = await revokeAdminHandler(
      makeReq('POST', 'http://localhost/.netlify/functions/revoke-admin-access'),
    );
    expect(res.status).toBe(403);
    const body = await res.json() as { error: string };
    expect(body.error).toBe('forbidden');
  });
});

// ── feature-override ──────────────────────────────────────────────────────────

describe('feature-override handler — gate rejection', () => {
  it('returns 405 for a GET request', async () => {
    const res = await featureOverrideHandler(
      makeReq('GET', 'http://localhost/.netlify/functions/feature-override'),
    );
    expect(res.status).toBe(405);
  });

  it('returns 503 when backend is not configured', async () => {
    supabaseMocks.configured = false;
    const res = await featureOverrideHandler(
      makeReq('POST', 'http://localhost/.netlify/functions/feature-override'),
    );
    expect(res.status).toBe(503);
  });

  it('returns 401 when bearer token is missing or invalid', async () => {
    supabaseMocks.configured = true;
    supabaseMocks.bearerResult = { userId: null, error: 'unauthorized' };
    const res = await featureOverrideHandler(
      makeReq('POST', 'http://localhost/.netlify/functions/feature-override'),
    );
    expect(res.status).toBe(401);
  });

  it('returns 403 when caller is not a platform admin', async () => {
    supabaseMocks.configured = true;
    supabaseMocks.bearerResult = { userId: 'not-admin', error: undefined };
    supabaseMocks.platformAdminRow = null;
    const res = await featureOverrideHandler(
      makeReq('POST', 'http://localhost/.netlify/functions/feature-override'),
    );
    expect(res.status).toBe(403);
  });
});

// ── billing-checkout ──────────────────────────────────────────────────────────

describe('billing-checkout handler — gate rejection', () => {
  it('returns 405 for a GET request', async () => {
    const res = await billingCheckoutHandler(
      makeReq('GET', 'http://localhost/.netlify/functions/billing-checkout'),
    );
    expect(res.status).toBe(405);
  });

  it('returns 503 when backend is not configured', async () => {
    supabaseMocks.configured = false;
    const res = await billingCheckoutHandler(
      makeReq('POST', 'http://localhost/.netlify/functions/billing-checkout'),
    );
    expect(res.status).toBe(503);
  });

  it('returns 401 when bearer token is missing or invalid', async () => {
    supabaseMocks.configured = true;
    supabaseMocks.bearerResult = { userId: null, error: 'unauthorized' };
    const res = await billingCheckoutHandler(
      makeReq('POST', 'http://localhost/.netlify/functions/billing-checkout'),
    );
    expect(res.status).toBe(401);
  });

  it('returns 403 when caller is not admin of the target asociatie', async () => {
    supabaseMocks.configured = true;
    supabaseMocks.bearerResult = { userId: 'user-1', error: undefined };
    supabaseMocks.memberRow = null;
    const res = await billingCheckoutHandler(
      makeReq(
        'POST',
        'http://localhost/.netlify/functions/billing-checkout',
        {},
        JSON.stringify({ plan_id: 'plan-standard', asociatie_id: 'asoc-1' }),
      ),
    );
    expect(res.status).toBe(403);
    const body = await res.json() as { error: string };
    expect(body.error).toBe('forbidden');
  });
});

// ── gdpr-retention-purge ──────────────────────────────────────────────────────

describe('gdpr-retention-purge handler — gate rejection', () => {
  it('returns 503 when backend is not configured (manual POST)', async () => {
    supabaseMocks.configured = false;
    const res = await purgeHandler(
      makeReq('POST', 'http://localhost/.netlify/functions/gdpr-retention-purge', {
        'x-forwarded-for': '1.2.3.4',
      }),
    );
    expect(res.status).toBe(503);
  });

  it('returns 401 when manual POST has invalid bearer token', async () => {
    supabaseMocks.configured = true;
    supabaseMocks.bearerResult = { userId: null, error: 'unauthorized' };
    const res = await purgeHandler(
      makeReq('POST', 'http://localhost/.netlify/functions/gdpr-retention-purge', {
        Authorization: 'Bearer invalid',
        'x-forwarded-for': '1.2.3.4',
      }),
    );
    expect(res.status).toBe(401);
    const body = await res.json() as { error: string };
    expect(body.error).toBe('unauthorized');
  });

  it('returns 403 when manual POST caller is not a platform admin', async () => {
    supabaseMocks.configured = true;
    supabaseMocks.bearerResult = { userId: 'user-not-admin', error: undefined };
    supabaseMocks.platformAdminRow = null;
    const res = await purgeHandler(
      makeReq('POST', 'http://localhost/.netlify/functions/gdpr-retention-purge', {
        Authorization: 'Bearer valid-token',
        'x-forwarded-for': '1.2.3.4',
      }),
    );
    expect(res.status).toBe(403);
    const body = await res.json() as { error: string };
    expect(body.error).toBe('forbidden');
  });
});

// ── platform-list-invites ─────────────────────────────────────────────────────

describe('platform-list-invites handler — gate rejection', () => {
  it('returns 405 for a POST request (only GET is accepted)', async () => {
    const res = await listInvitesHandler(
      makeReq('POST', 'http://localhost/.netlify/functions/platform-list-invites'),
    );
    expect(res.status).toBe(405);
    const body = await res.json() as { error: string };
    expect(body.error).toBe('method-not-allowed');
  });

  it('returns 503 when backend is not configured', async () => {
    supabaseMocks.configured = false;
    const res = await listInvitesHandler(
      makeReq('GET', 'http://localhost/.netlify/functions/platform-list-invites'),
    );
    expect(res.status).toBe(503);
    const body = await res.json() as { error: string };
    expect(body.error).toBe('backend-not-configured');
  });

  it('returns 401 when bearer token is missing or invalid', async () => {
    supabaseMocks.configured = true;
    supabaseMocks.bearerResult = { userId: null, error: 'unauthorized' };
    const res = await listInvitesHandler(
      makeReq('GET', 'http://localhost/.netlify/functions/platform-list-invites'),
    );
    expect(res.status).toBe(401);
    const body = await res.json() as { error: string };
    expect(body.error).toBe('unauthorized');
  });

  it('returns 403 when caller is not a platform admin', async () => {
    supabaseMocks.configured = true;
    supabaseMocks.bearerResult = { userId: 'user-not-admin', error: undefined };
    supabaseMocks.platformAdminRow = null;
    const res = await listInvitesHandler(
      makeReq('GET', 'http://localhost/.netlify/functions/platform-list-invites', {
        Authorization: 'Bearer valid-token',
      }),
    );
    expect(res.status).toBe(403);
    const body = await res.json() as { error: string };
    expect(body.error).toBe('forbidden');
  });
});
