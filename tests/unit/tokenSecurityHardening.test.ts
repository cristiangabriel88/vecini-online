import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// T128 -- Token-security hardening: hash tokens at rest + rate limit + audit.
//
// These static-analysis tests verify the key structural properties without
// spinning up a Supabase instance.

const INVITE_WRITE_SRC = resolve(process.cwd(), 'src', 'features', 'invites', 'inviteWriteApi.ts');
const SHA256_SRC = resolve(process.cwd(), 'src', 'shared', 'lib', 'sha256.ts');
const ONBOARDING_API_SRC = resolve(process.cwd(), 'src', 'features', 'onboarding', 'onboardingApi.ts');
const AUDIT_LOGIC_SRC = resolve(process.cwd(), 'src', 'features', 'audit', 'auditLogic.ts');
const MIGRATION_SRC = resolve(
  process.cwd(),
  'supabase',
  'migrations',
  '20260528000003_token_security_hardening.sql',
);

describe('inviteWriteApi: token hashing before live storage (T128)', () => {
  const src = readFileSync(INVITE_WRITE_SRC, 'utf8');

  it('imports and calls sha256Hex (implementation lives in shared/lib/sha256.ts)', () => {
    expect(src).toContain('sha256Hex');
    // The crypto.subtle.digest call is in the shared utility; verify it is there.
    const sha256Src = readFileSync(SHA256_SRC, 'utf8');
    expect(sha256Src).toContain("crypto.subtle.digest('SHA-256'");
  });

  it('passes tokenHash (not invite.token) to the DB insert', () => {
    // The raw invite.token must NOT appear as the value in the insert object.
    // The hashed value (tokenHash) must be used instead.
    expect(src).toContain('token: tokenHash');
    // Confirm invite.token is NOT directly assigned in the insert block.
    const insertIdx = src.indexOf('.insert({');
    const tokenDirectIdx = src.indexOf('token: invite.token', insertIdx);
    expect(tokenDirectIdx).toBe(-1);
  });

  it('awaits sha256Hex before the insert call', () => {
    const hashIdx = src.indexOf('await sha256Hex(invite.token)');
    const insertIdx = src.indexOf('.insert({');
    expect(hashIdx).toBeGreaterThan(0);
    expect(insertIdx).toBeGreaterThan(hashIdx);
  });
});

describe('onboardingApi: rate_limited status in RedeemRpcResult (T128)', () => {
  const src = readFileSync(ONBOARDING_API_SRC, 'utf8');

  it("includes 'rate_limited' in the RedeemRpcResult status union", () => {
    expect(src).toContain("'rate_limited'");
  });
});

describe('auditLogic: invite.redeemed action registered (T128)', () => {
  const src = readFileSync(AUDIT_LOGIC_SRC, 'utf8');

  it("includes 'invite.redeemed' in AUDIT_ACTIONS", () => {
    expect(src).toContain("'invite.redeemed'");
  });

  it('invite.redeemed appears after invite.email_sent in the catalogue', () => {
    const emailSentIdx = src.indexOf("'invite.email_sent'");
    const redeemedIdx = src.indexOf("'invite.redeemed'");
    expect(emailSentIdx).toBeGreaterThan(0);
    expect(redeemedIdx).toBeGreaterThan(emailSentIdx);
  });
});

describe('migration 20260528000003: token-security hardening SQL (T128)', () => {
  const sql = readFileSync(MIGRATION_SRC, 'utf8');

  it('enables pgcrypto extension', () => {
    expect(sql).toContain('CREATE EXTENSION IF NOT EXISTS pgcrypto');
  });

  it('hashes existing tokens in-place with sha256', () => {
    expect(sql).toContain("encode(extensions.digest(token, 'sha256'), 'hex')");
    expect(sql).toContain('UPDATE public.invite_codes');
  });

  it('creates the token_redemption_attempts table', () => {
    expect(sql).toContain('token_redemption_attempts');
    expect(sql).toContain('ENABLE ROW LEVEL SECURITY');
  });

  it('rate-limits at 10 attempts per 15-minute window', () => {
    expect(sql).toContain('>= 10');
    expect(sql).toContain("INTERVAL '15 minutes'");
  });

  it('inserts an invite.redeemed audit event on success', () => {
    expect(sql).toContain("'invite.redeemed'");
    expect(sql).toContain('INSERT INTO public.audit_log');
  });

  it('hashes p_token before looking up the invite row (resolve)', () => {
    // Both RPCs must compute the hash and look up by it, using the schema-qualified
    // extensions.digest() so the call works on hosted Supabase (pgcrypto lives under
    // the extensions schema there).
    const resolveIdx = sql.indexOf('resolve_onboarding_token');
    const hashInResolve = sql.indexOf(
      "encode(extensions.digest(p_token, 'sha256'), 'hex')",
      resolveIdx,
    );
    expect(hashInResolve).toBeGreaterThan(resolveIdx);
  });

  it('hashes p_token before looking up the invite row (redeem)', () => {
    const redeemIdx = sql.indexOf('redeem_onboarding_token');
    const hashInRedeem = sql.indexOf(
      "encode(extensions.digest(p_token, 'sha256'), 'hex')",
      redeemIdx,
    );
    expect(hashInRedeem).toBeGreaterThan(redeemIdx);
  });

  it('records attempt only for known token hashes (prevents unbounded growth)', () => {
    // Attempt recording must happen AFTER the FOR UPDATE lookup (NOT FOUND check).
    const notFoundIdx = sql.indexOf('IF NOT FOUND THEN');
    // Find the second NOT FOUND (the one inside redeem, after the FOR UPDATE lock).
    const secondNotFoundIdx = sql.indexOf('IF NOT FOUND THEN', notFoundIdx + 1);
    const attemptInsertIdx = sql.indexOf(
      'INSERT INTO public.token_redemption_attempts',
      secondNotFoundIdx,
    );
    expect(secondNotFoundIdx).toBeGreaterThan(0);
    expect(attemptInsertIdx).toBeGreaterThan(secondNotFoundIdx);
  });
});
