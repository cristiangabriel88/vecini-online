import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Token hash-at-rest invariants for admin setup invites.
//
// The onboarding RPCs (resolve_onboarding_token / redeem_onboarding_token,
// migration 20260528000003) look invite_codes rows up by sha256(plaintext).
// Every server-side writer of invite_codes.token must therefore store the
// digest, never the plaintext: a plaintext row can never be resolved, which
// silently breaks every freshly provisioned admin setup link in production.
// These static-contract tests fail the build if a writer regresses.

const FUNCTIONS = [
  'provision-asociatie.ts',
  'provision-additional-admin.ts',
  'admin-invite-action.ts',
] as const;

function read(fn: string): string {
  return readFileSync(resolve(process.cwd(), 'netlify', 'functions', fn), 'utf8');
}

describe('invite token is hashed at rest (T128 contract)', () => {
  for (const fn of FUNCTIONS) {
    it(`${fn} computes a sha256 digest of the token before any DB write`, () => {
      const src = read(fn);
      expect(src).toContain("createHash('sha256')");
      expect(src).toContain(".digest('hex')");
    });

    it(`${fn} never inserts or updates the plaintext token column`, () => {
      const src = read(fn);
      // The literal property `token: token,` / shorthand `token,` inside an
      // insert/update payload would store plaintext. Writers must use the
      // hashed variable (token: tokenHash / token: newTokenHash).
      expect(src).not.toMatch(/token:\s*token\b/);
      expect(src).not.toMatch(/\.insert\(\{[^)]*\n\s+token,/);
      expect(src).toMatch(/token:\s*(tokenHash|newTokenHash)/);
    });
  }

  it('admin-invite-action resolves a non-UUID inviteId by hashing it (link tokens work)', () => {
    const src = read('admin-invite-action.ts');
    expect(src).toContain('UUID_RE');
    // Non-UUID lookups must go through the digest, never raw equality on token.
    expect(src).toMatch(/eq\('token',\s*createHash\('sha256'\)/);
    // The client value must not be interpolated into a PostgREST or() filter.
    expect(src).not.toMatch(/\.or\(`/);
  });

  it('the email link carries the plaintext token, not the digest', () => {
    for (const fn of FUNCTIONS) {
      const src = read(fn);
      if (!src.includes('buildOnboardingLink')) continue;
      // The link builder must be called with the plaintext variable.
      expect(src).toMatch(/buildOnboardingLink\([^,]+,\s*(token|newToken)\)/);
      expect(src).not.toMatch(/buildOnboardingLink\([^,]+,\s*\w*[tT]okenHash\)/);
    }
  });
});
