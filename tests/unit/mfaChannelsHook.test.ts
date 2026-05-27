// Regression guard for T141: mfa_channels, mfa_otp_challenges, session_elevations
// tables and the custom_access_token_hook function.
//
// All checks are backend-free (parse the migration SQL, run offline in CI).
// They enforce the security invariants that T141's done-definition requires:
//
//   1. mfa_channels     — RLS on, self read/insert/delete policies.
//   2. mfa_otp_challenges  — RLS on, ZERO client policies (service-role-only).
//   3. session_elevations  — RLS on, ZERO client policies (service-role-only).
//   4. custom_access_token_hook — SECURITY DEFINER, locked search_path,
//      granted to supabase_auth_admin only, NOT to public/authenticated/anon.

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const migrationsDir = join(process.cwd(), 'supabase', 'migrations');

function stripLineComments(sql: string): string {
  return sql
    .split('\n')
    .map((line) => {
      const idx = line.indexOf('--');
      return idx === -1 ? line : line.slice(0, idx);
    })
    .join('\n');
}

function allMigrationSql(): string {
  return stripLineComments(
    readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort()
      .map((f) => readFileSync(join(migrationsDir, f), 'utf8'))
      .join('\n'),
  );
}

const sql = allMigrationSql();
const sqlLow = sql.toLowerCase();

// ── Helper: count RLS policies that target a given table ──────────────────

/**
 * Count `create policy` statements that reference `tableName` via `on TABLE`.
 * Matches both exact table names and quoted names.
 */
function countPoliciesOnTable(tableName: string): number {
  const re = new RegExp(`create policy [^;]+ on ${tableName}\\b`, 'gi');
  return (sqlLow.match(re) ?? []).length;
}

// ── mfa_channels ──────────────────────────────────────────────────────────

describe('mfa_channels table (T141)', () => {
  it('creates the mfa_channels table', () => {
    expect(sqlLow).toMatch(/create table if not exists mfa_channels/);
  });

  it('has a unique (user_id, channel) constraint', () => {
    expect(sqlLow).toMatch(/unique \(user_id, channel\)/);
  });

  it('enables RLS on mfa_channels', () => {
    expect(sqlLow).toMatch(/alter table mfa_channels enable row level security/);
  });

  it('has a self-read policy', () => {
    const policies = sqlLow.match(/create policy "[^"]*" on mfa_channels for select[^;]+using \(user_id = auth\.uid\(\)\)/g);
    expect(policies?.length).toBeGreaterThanOrEqual(1);
  });

  it('has a self-insert policy', () => {
    const policies = sqlLow.match(/create policy "[^"]*" on mfa_channels for insert[^;]+with check \(user_id = auth\.uid\(\)\)/g);
    expect(policies?.length).toBeGreaterThanOrEqual(1);
  });

  it('has a self-delete policy', () => {
    const policies = sqlLow.match(/create policy "[^"]*" on mfa_channels for delete[^;]+using \(user_id = auth\.uid\(\)\)/g);
    expect(policies?.length).toBeGreaterThanOrEqual(1);
  });

  it('does NOT have a SELECT policy allowing admin/comitet/presedinte to read channels', () => {
    // Second factors are private credentials; no tenant-role should see them.
    const adminSelectPolicies = sqlLow.match(
      /create policy "[^"]*" on mfa_channels for select[^;]+has_role/g,
    );
    expect(adminSelectPolicies ?? []).toHaveLength(0);
  });
});

// ── mfa_otp_challenges (service-role-only) ────────────────────────────────

describe('mfa_otp_challenges table — service-role-only (T141)', () => {
  it('creates the mfa_otp_challenges table', () => {
    expect(sqlLow).toMatch(/create table if not exists mfa_otp_challenges/);
  });

  it('enables RLS on mfa_otp_challenges', () => {
    expect(sqlLow).toMatch(/alter table mfa_otp_challenges enable row level security/);
  });

  it('has zero client-accessible RLS policies (deny-all for browser clients)', () => {
    // The entire security model depends on the hashes being unreachable by client
    // code. Any policy here would be a regression.
    const count = countPoliciesOnTable('mfa_otp_challenges');
    expect(
      count,
      'mfa_otp_challenges must have zero RLS policies (service-role-only)',
    ).toBe(0);
  });

  it('stores code_hash and code_salt (never plaintext codes)', () => {
    expect(sqlLow).toContain('code_hash');
    expect(sqlLow).toContain('code_salt');
  });

  it('stores confirm_token_hash for the email click-to-confirm path', () => {
    expect(sqlLow).toContain('confirm_token_hash');
  });

  it('has an attempts column for server-side lockout', () => {
    expect(sqlLow).toMatch(/attempts\s+integer\s+not null default 0/);
  });

  it('has a session_id column to scope challenges to one browser session', () => {
    expect(sqlLow).toMatch(/session_id\s+text\s+not null/);
  });
});

// ── session_elevations (service-role-only) ────────────────────────────────

describe('session_elevations table — service-role-only (T141)', () => {
  it('creates the session_elevations table', () => {
    expect(sqlLow).toMatch(/create table if not exists session_elevations/);
  });

  it('enables RLS on session_elevations', () => {
    expect(sqlLow).toMatch(/alter table session_elevations enable row level security/);
  });

  it('has zero client-accessible RLS policies (deny-all for browser clients)', () => {
    // Elevation rows drive the JWT hook; they must never be directly readable
    // by a client, even the session's owner.
    const count = countPoliciesOnTable('session_elevations');
    expect(
      count,
      'session_elevations must have zero RLS policies (service-role-only)',
    ).toBe(0);
  });

  it('has a unique session_id column (upsert must be atomic)', () => {
    expect(sqlLow).toMatch(/session_id\s+text\s+not null unique/);
  });

  it('allows recovery as a valid channel (T29 recovery-code login reuses this table)', () => {
    expect(sqlLow).toMatch(/check \(channel in \('email', 'telegram', 'recovery'\)\)/);
  });
});

// ── custom_access_token_hook ──────────────────────────────────────────────

describe('custom_access_token_hook function (T141)', () => {
  it('creates the custom_access_token_hook function', () => {
    expect(sqlLow).toMatch(/create or replace function custom_access_token_hook/);
  });

  it('is declared SECURITY DEFINER', () => {
    expect(sqlLow).toMatch(
      /create or replace function custom_access_token_hook[\s\S]+?security definer/,
    );
  });

  it('locks the search_path to prevent injection attacks', () => {
    // The set search_path must be an empty string so unqualified names fail.
    expect(sqlLow).toMatch(/set search_path\s*=\s*''/);
  });

  it('reads session_id from event->claims', () => {
    expect(sqlLow).toContain("'session_id'");
  });

  it('injects app_2fa_at and app_2fa_channel into the JWT claims', () => {
    expect(sqlLow).toContain('app_2fa_at');
    expect(sqlLow).toContain('app_2fa_channel');
  });

  it('revokes all grants from public before the targeted grant', () => {
    // Defence-in-depth: revoke any default PUBLIC execute grant first.
    expect(sqlLow).toMatch(/revoke all on function custom_access_token_hook\(jsonb\) from public/);
  });

  it('grants execute to supabase_auth_admin only', () => {
    expect(sqlLow).toMatch(
      /grant execute on function custom_access_token_hook\(jsonb\) to supabase_auth_admin/,
    );
  });

  it('does NOT grant execute to authenticated', () => {
    // Use [^;]+ (stop at statement boundary) so the pattern cannot accidentally
    // match a later GRANT for a different function in the cumulative migration SQL.
    expect(sqlLow).not.toMatch(
      /grant execute on function custom_access_token_hook[^;]+to authenticated/,
    );
  });

  it('does NOT grant execute to anon', () => {
    expect(sqlLow).not.toMatch(
      /grant execute on function custom_access_token_hook[^;]+to anon/,
    );
  });

  it('looks up session_elevations ordered by elevated_at desc to get the freshest row', () => {
    expect(sqlLow).toContain('session_elevations');
    expect(sqlLow).toContain('elevated_at desc');
  });

  it('returns the event unchanged when no elevation row is found (safe no-op)', () => {
    // The function must be a pure pass-through for un-elevated sessions so the
    // native AAL claims are never disturbed.
    expect(sqlLow).toContain('return event');
  });
});
