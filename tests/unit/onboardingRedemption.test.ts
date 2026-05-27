import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Static source tests for the T55 onboarding redemption implementation.
 *
 * No live Supabase connection needed -- these read the migration SQL and
 * TypeScript source files to assert structural contracts that cannot be
 * changed silently without a failing test:
 *
 * Migration contracts (resolve_onboarding_token + redeem_onboarding_token):
 * - Both RPCs are defined as SECURITY DEFINER with locked search_path
 * - Grant/revoke contracts (who can call each RPC)
 * - auth.uid() is used server-side in redeem
 * - Token is re-validated in redeem (replay-safe)
 * - users row is upserted
 * - memberships row is inserted
 * - admin_setup kind maps to 'admin' membership role
 * - invite consumed (consumed_at + consumed_by_user_id)
 *
 * AccountSetupPage contracts:
 * - Live branch calls supabase.auth.signUp
 * - Live branch delegates to resolveTokenLive + redeemTokenLive (from onboardingApi)
 * - Offline/demo path still present (redeemInvite + consumeSetup)
 */

const migrationsDir = join(process.cwd(), 'supabase', 'migrations');
const accountSetupPagePath = join(
  process.cwd(),
  'src',
  'features',
  'onboarding',
  'AccountSetupPage.tsx',
);
const onboardingApiPath = join(
  process.cwd(),
  'src',
  'features',
  'onboarding',
  'onboardingApi.ts',
);

function allMigrationSql(): string {
  return readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => readFileSync(join(migrationsDir, f), 'utf8'))
    .join('\n');
}

const sql = allMigrationSql().toLowerCase();
const pageSrc = readFileSync(accountSetupPagePath, 'utf8');
const apiSrc = readFileSync(onboardingApiPath, 'utf8');

// ── Migration: RPC definitions ──────────────────────────────────────────────

describe('T55 -- resolve_onboarding_token migration', () => {
  it('defines resolve_onboarding_token function', () => {
    expect(sql).toContain(
      'create or replace function public.resolve_onboarding_token(p_token text)',
    );
  });

  it('uses security definer', () => {
    expect(sql).toMatch(/resolve_onboarding_token[\s\S]{0,200}security definer/);
  });

  it('locks search_path to prevent injection', () => {
    expect(sql).toMatch(/resolve_onboarding_token[\s\S]{0,300}set search_path = ''/);
  });

  it('revokes execute from public', () => {
    expect(sql).toContain(
      'revoke all on function public.resolve_onboarding_token(text) from public',
    );
  });

  it('grants execute to anon and authenticated', () => {
    expect(sql).toContain(
      'grant execute on function public.resolve_onboarding_token(text) to anon, authenticated',
    );
  });

  it('checks revoked_at (revoked status)', () => {
    // The resolve body must check revoked_at before returning ok.
    const resolveBlock = sql.match(
      /create or replace function public\.resolve_onboarding_token[\s\S]+?end;\s*\$\$/,
    );
    expect(resolveBlock).not.toBeNull();
    expect(resolveBlock![0]).toContain('revoked_at');
  });

  it('checks consumed_at (used status) for single_use codes', () => {
    const resolveBlock = sql.match(
      /create or replace function public\.resolve_onboarding_token[\s\S]+?end;\s*\$\$/,
    );
    expect(resolveBlock).not.toBeNull();
    expect(resolveBlock![0]).toContain('consumed_at');
  });

  it('checks expires_at (expired status)', () => {
    const resolveBlock = sql.match(
      /create or replace function public\.resolve_onboarding_token[\s\S]+?end;\s*\$\$/,
    );
    expect(resolveBlock).not.toBeNull();
    expect(resolveBlock![0]).toContain('expires_at');
  });
});

// ── Migration: RPC redeem contracts ────────────────────────────────────────

describe('T55 -- redeem_onboarding_token migration', () => {
  it('defines redeem_onboarding_token function with three parameters', () => {
    expect(sql).toContain(
      'create or replace function public.redeem_onboarding_token(',
    );
    expect(sql).toContain('p_token     text');
    expect(sql).toContain('p_full_name text');
    expect(sql).toContain('p_locale    text');
  });

  it('uses security definer', () => {
    expect(sql).toMatch(/redeem_onboarding_token[\s\S]{0,200}security definer/);
  });

  it('locks search_path to prevent injection', () => {
    expect(sql).toMatch(/redeem_onboarding_token[\s\S]{0,300}set search_path = ''/);
  });

  it('revokes execute from public', () => {
    expect(sql).toContain(
      'revoke all on function public.redeem_onboarding_token(text, text, text) from public',
    );
  });

  it('grants execute only to authenticated (not anon)', () => {
    const grantMatch = sql.match(
      /grant execute on function public\.redeem_onboarding_token\(text, text, text\) to ([^\n;]+)/,
    );
    expect(grantMatch).not.toBeNull();
    const grantees = grantMatch![1].trim();
    expect(grantees).toContain('authenticated');
    expect(grantees).not.toContain('anon');
  });

  it('uses auth.uid() server-side (never trusts client-supplied user id)', () => {
    expect(sql).toContain('v_user_id := auth.uid()');
  });

  it('re-validates revoked_at in redeem body (not only in resolve)', () => {
    const redeemBlock = sql.match(
      /create or replace function public\.redeem_onboarding_token[\s\S]+?end;\s*\$\$/,
    );
    expect(redeemBlock).not.toBeNull();
    expect(redeemBlock![0]).toContain('revoked_at');
  });

  it('re-validates consumed_at in redeem body', () => {
    const redeemBlock = sql.match(
      /create or replace function public\.redeem_onboarding_token[\s\S]+?end;\s*\$\$/,
    );
    expect(redeemBlock).not.toBeNull();
    expect(redeemBlock![0]).toContain('consumed_at');
  });

  it('re-validates expires_at in redeem body', () => {
    const redeemBlock = sql.match(
      /create or replace function public\.redeem_onboarding_token[\s\S]+?end;\s*\$\$/,
    );
    expect(redeemBlock).not.toBeNull();
    expect(redeemBlock![0]).toContain('expires_at');
  });

  it('upserts a users row (on conflict id do update)', () => {
    expect(sql).toContain('insert into public.users');
    expect(sql).toContain('on conflict (id) do update');
  });

  it('inserts a memberships row', () => {
    expect(sql).toContain('insert into public.memberships');
    expect(sql).toContain('on conflict (user_id, asociatie_id, role) do nothing');
  });

  it("maps admin_setup kind to 'admin' membership role", () => {
    expect(sql).toContain("'admin_setup' then 'admin'");
  });

  it('uses invite role for resident_invite memberships (v_role variable)', () => {
    const redeemBlock = sql.match(
      /create or replace function public\.redeem_onboarding_token[\s\S]+?end;\s*\$\$/,
    );
    expect(redeemBlock).not.toBeNull();
    expect(redeemBlock![0]).toContain('v_membership_role');
    expect(redeemBlock![0]).toContain('v_role');
  });

  it('marks invite consumed via consumed_at + consumed_by_user_id', () => {
    expect(sql).toContain('consumed_at = now()');
    expect(sql).toContain('consumed_by_user_id = v_user_id');
  });

  it('links apartment_residents when invite has apartment_id and matching role', () => {
    expect(sql).toContain('insert into public.apartment_residents');
  });
});

// ── AccountSetupPage: live branch contracts ─────────────────────────────────

describe('T55 -- AccountSetupPage live branch', () => {
  it('calls supabase.auth.signUp for live account creation', () => {
    expect(pageSrc).toContain('supabase.auth.signUp');
  });

  it('uses resolveTokenLive from onboardingApi for live token resolution', () => {
    expect(pageSrc).toContain('resolveTokenLive');
  });

  it('uses redeemTokenLive from onboardingApi for live redemption', () => {
    expect(pageSrc).toContain('redeemTokenLive');
  });

  it('imports resolveTokenLive and redeemTokenLive from onboardingApi', () => {
    expect(pageSrc).toContain("from './onboardingApi'");
  });

  it('calls hydrate() after successful redemption to sync auth store', () => {
    expect(pageSrc).toContain('hydrate');
  });

  it('offline/demo path preserved -- redeemInvite still present', () => {
    expect(pageSrc).toContain('redeemInvite');
  });

  it('offline/demo path preserved -- consumeSetup still present', () => {
    expect(pageSrc).toContain('consumeSetup');
  });

  it('shows a resolving indicator while the live RPC is in flight', () => {
    expect(pageSrc).toContain('resolving');
  });
});

// ── onboardingApi: RPC call contracts ──────────────────────────────────────

describe('T55 -- onboardingApi calls correct RPC names', () => {
  it("calls 'resolve_onboarding_token' RPC", () => {
    expect(apiSrc).toContain("'resolve_onboarding_token'");
  });

  it("calls 'redeem_onboarding_token' RPC", () => {
    expect(apiSrc).toContain("'redeem_onboarding_token'");
  });

  it('passes p_token param to resolve RPC', () => {
    expect(apiSrc).toContain('p_token: token');
  });

  it('passes p_full_name param to redeem RPC', () => {
    expect(apiSrc).toContain('p_full_name: fullName');
  });

  it('passes p_locale param to redeem RPC', () => {
    expect(apiSrc).toContain('p_locale: locale');
  });
});
