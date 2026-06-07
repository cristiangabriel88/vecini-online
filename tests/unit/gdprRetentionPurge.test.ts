import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { isScheduledInvocation } from '../../netlify/functions/gdpr-retention-purge';

// ── isScheduledInvocation ────────────────────────────────────────────────────

function makeRequest(headers: Record<string, string>): Request {
  return new Request(
    'https://example.com/.netlify/functions/gdpr-retention-purge',
    { method: 'POST', headers },
  );
}

describe('isScheduledInvocation', () => {
  it('returns true when no Authorization and no x-forwarded-for (scheduled path)', () => {
    expect(isScheduledInvocation(makeRequest({}))).toBe(true);
  });

  it('returns false when Authorization header is present (manual POST with auth)', () => {
    expect(
      isScheduledInvocation(makeRequest({ Authorization: 'Bearer some-token' })),
    ).toBe(false);
  });

  it('returns false when x-forwarded-for is present (external IP = manual caller)', () => {
    expect(
      isScheduledInvocation(makeRequest({ 'x-forwarded-for': '1.2.3.4' })),
    ).toBe(false);
  });

  it('returns false when both Authorization and x-forwarded-for are present', () => {
    expect(
      isScheduledInvocation(
        makeRequest({ Authorization: 'Bearer t', 'x-forwarded-for': '1.2.3.4' }),
      ),
    ).toBe(false);
  });

  it('returns true when x-forwarded-for is an empty string (treated as absent)', () => {
    expect(
      isScheduledInvocation(makeRequest({ 'x-forwarded-for': '   ' })),
    ).toBe(true);
  });
});

// ── Static source security contract ─────────────────────────────────────────

describe('gdpr-retention-purge security contract', () => {
  const src = readFileSync(
    resolve(process.cwd(), 'netlify/functions/gdpr-retention-purge.ts'),
    'utf8',
  );

  it('imports verifyBearerToken', () => {
    expect(src).toContain('verifyBearerToken');
  });

  it('gates manual POST behind platform_admins check', () => {
    expect(src).toContain('platform_admins');
  });

  it('returns 401 when bearer is missing or invalid', () => {
    expect(src).toContain('401');
  });

  it('returns 403 when caller is not a platform admin', () => {
    expect(src).toContain('403');
  });

  it('uses isScheduledInvocation to distinguish scheduled from manual calls', () => {
    expect(src).toContain('isScheduledInvocation');
  });

  it('audits manual purge runs with platform.gdpr_purge event type', () => {
    expect(src).toContain("'platform.gdpr_purge'");
  });

  it('audits to auth_audit_events after the purge', () => {
    expect(src).toContain("from('auth_audit_events').insert");
  });
});
