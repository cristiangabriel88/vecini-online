import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// T79 -- Every RLS-enabled public table must carry at least one policy, OR be
// explicitly listed in INTENTIONAL_DENY_ALL below with a documented reason.
//
// A table with RLS ON + zero policies is deny-all for anon/authenticated clients
// (no rows can be read or written through PostgREST). That is *correct* for
// service-role-only tables, but it is an accidental oversight for any data table.
// This guard makes "zero policies" a deliberate, named choice rather than a silent bug.
//
// Complements:
//   rlsCoverage.test.ts        (T35) -- every public table has RLS enabled
//   rlsTenantIsolation.test.ts (T04) -- tenant-isolation invariants in helper functions

// SERVICE-ROLE-ONLY tables: intentionally deny-all (RLS on + zero client-facing
// policies). All access goes through SECURITY DEFINER functions or the service-role
// client; no browser/PostgREST client should ever read or write these rows directly.
const INTENTIONAL_DENY_ALL: Record<string, string> = {
  mfa_otp_challenges:
    'OTP challenge hashes (HMAC-SHA256, never plaintext). Written and read by the T142 ' +
    'Netlify service-role function only. Zero policies = deny-all for anon/authenticated; ' +
    'prevents any client from reading code hashes through PostgREST.',
  session_elevations:
    'Elevated-session flags written by the T142 OTP-verify function and read by the ' +
    'Custom Access Token Hook. Both run as service-role / function-owner and bypass RLS; ' +
    'no browser client should ever touch these rows.',
  login_attempt_locks:
    'Login-lockout state. All access goes through the SECURITY DEFINER functions ' +
    'check_login_lock / record_login_failure / clear_login_lock (run as function owner, ' +
    'bypassing RLS). REVOKE ALL ... FROM anon, authenticated was also applied in ' +
    '20260529000002_login_attempt_locks.sql.',
  mfa_recovery_attempt_counts:
    'Recovery-code attempt counter. Written by the recovery-code verification function ' +
    '(SECURITY DEFINER). Zero policies = deny-all for all client roles.',
};

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

function parseRlsEnabled(sql: string): Set<string> {
  const enabled = new Set<string>();
  for (const m of sql.matchAll(/alter table (\w+) enable row level security/gi)) {
    enabled.add(m[1]);
  }
  for (const m of sql.matchAll(/apply_standard_rls\('(\w+)'\)/gi)) {
    enabled.add(m[1]);
  }
  return enabled;
}

// A table "has policies" if any migration creates a direct `create policy ... on TABLE`
// or calls one of the policy-adding macros for TABLE. The `create policy` regex uses a
// quoted-name group so that names containing spaces (e.g. "members read") are handled
// correctly; `%s` in the macro body templates does not match (\w+) so macro definitions
// themselves are never counted.
function parseTablesWithPolicies(sql: string): Set<string> {
  const has = new Set<string>();
  const re =
    /create\s+policy\s+(?:"[^"]*"|'[^']*'|\w+)\s+on\s+(?:only\s+)?(\w+)/gi;
  for (const m of sql.matchAll(re)) has.add(m[1]);
  for (const m of sql.matchAll(/apply_standard_rls\('(\w+)'\)/gi)) has.add(m[1]);
  for (const m of sql.matchAll(/apply_owner_rls\('(\w+)'/gi)) has.add(m[1]);
  for (const m of sql.matchAll(/reapply_owner_rls\('(\w+)'/gi)) has.add(m[1]);
  for (const m of sql.matchAll(/apply_member_insert_rls\('(\w+)'/gi)) has.add(m[1]);
  for (const m of sql.matchAll(/apply_governance_owner_rls\('(\w+)'/gi)) has.add(m[1]);
  return has;
}

describe('RLS policy coverage -- every RLS-enabled table has at least one policy or is intentionally deny-all (T79)', () => {
  const sql = allMigrationSql();
  const enabled = parseRlsEnabled(sql);
  const hasPolicies = parseTablesWithPolicies(sql);

  it('parses a meaningful number of RLS-enabled tables (schema is not a stub)', () => {
    expect(enabled.size).toBeGreaterThan(100);
  });

  it('recognises policies added via direct create policy and via macros', () => {
    expect(hasPolicies.has('announcements')).toBe(true);
    expect(hasPolicies.has('audit_log')).toBe(true);
    expect(hasPolicies.has('memberships')).toBe(true);
  });

  it('every RLS-enabled table either has at least one policy or is in the intentional deny-all allowlist', () => {
    const zeroPolicyTables = [...enabled].filter((t) => !hasPolicies.has(t)).sort();
    const undocumented = zeroPolicyTables.filter((t) => !(t in INTENTIONAL_DENY_ALL));
    expect(
      undocumented,
      `Tables with RLS ON but zero policies and NOT in INTENTIONAL_DENY_ALL: ` +
        `${undocumented.join(', ')}. Either add a policy, or add the table to ` +
        `INTENTIONAL_DENY_ALL with a documented reason.`,
    ).toEqual([]);
  });

  it('INTENTIONAL_DENY_ALL has no stale entries (every listed table still has RLS enabled)', () => {
    const stale = Object.keys(INTENTIONAL_DENY_ALL).filter((t) => !enabled.has(t));
    expect(
      stale,
      `Stale INTENTIONAL_DENY_ALL entries (table removed or RLS disabled): ${stale.join(', ')}`,
    ).toEqual([]);
  });

  it('every INTENTIONAL_DENY_ALL entry truly has zero policies (remove entry when a policy is added)', () => {
    const nowHasPolicies = Object.keys(INTENTIONAL_DENY_ALL).filter((t) => hasPolicies.has(t));
    expect(
      nowHasPolicies,
      `INTENTIONAL_DENY_ALL entries that now have at least one policy: ` +
        `${nowHasPolicies.join(', ')}. Remove them from the allowlist.`,
    ).toEqual([]);
  });
});
