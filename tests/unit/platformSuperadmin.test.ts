import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// T91 — Platform superadmin identity + cross-asociatie RLS foundation. The whole
// superadmin tier (T92 provisioning, T100 mandatory MFA, T93-T99 the console)
// rests on a small set of invariants in the migration SQL:
//   - is_super_admin() is a platform-WIDE security-definer helper with a fixed
//     search_path (mirroring is_member/has_role), reading platform_admins;
//   - platform_admins is RLS-enabled and carries NO client write policy (writes
//     run through the service role in the T92 server function);
//   - the cross-tenant grants the console needs are READ-ONLY and gated on
//     is_super_admin(), so they never widen a tenant member's scope and never
//     grant a platform admin cross-tenant write.
// This backend-free test (parses the migration SQL, runs offline in CI) fails the
// moment any of those is weakened. It complements the tenant-isolation guard
// (rlsTenantIsolation.test.ts, T04) and the RLS-coverage guard (rlsCoverage.test.ts,
// T35); live cross-tenant verification remains T08.

const migrationsDir = join(process.cwd(), 'supabase', 'migrations');

function allMigrationSql(): string {
  return readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => readFileSync(join(migrationsDir, f), 'utf8'))
    .join('\n');
}

// Collapse whitespace so multi-line policy bodies match on a single line.
function flatten(sql: string): string {
  return sql.toLowerCase().replace(/\s+/g, ' ');
}

// The tables that genuinely exist today and receive the cross-tenant read.
const CROSS_TENANT_READ_TABLES = ['asociatii', 'memberships', 'audit_log'] as const;

describe('platform superadmin foundation (T91)', () => {
  const raw = allMigrationSql();
  const sql = flatten(raw);

  it('is_super_admin() is a platform-wide security-definer helper with a fixed search_path', () => {
    // No asociatie argument: it is platform-wide, not tenant-scoped.
    expect(sql).toContain(
      'function is_super_admin() returns boolean language sql stable security definer set search_path = public',
    );
  });

  it('is_super_admin() resolves the caller against the platform_admins roster', () => {
    const fn = sql.match(/create or replace function is_super_admin\(\)[^$]*\$\$(.*?)\$\$/s);
    expect(fn, 'is_super_admin must be defined').not.toBeNull();
    const body = fn![1];
    expect(body).toContain('from platform_admins');
    expect(body).toContain('p.user_id = auth.uid()');
  });

  it('platform_admins is created, RLS-enabled, and carries no asociatie_id (it is not tenant-scoped)', () => {
    expect(sql).toContain('create table if not exists platform_admins');
    expect(sql).toContain('alter table platform_admins enable row level security');
    // The roster is platform-wide; a tenant column would wrongly pull it into the
    // per-asociatie isolation model.
    const tableDef = raw.match(/create table if not exists platform_admins \(([\s\S]*?)\);/i);
    expect(tableDef, 'platform_admins table body must be present').not.toBeNull();
    expect(tableDef![1].toLowerCase()).not.toContain('asociatie_id');
  });

  it('platform_admins is readable only by a platform admin and has no client write policy', () => {
    expect(sql).toMatch(
      /create policy "[^"]*" on platform_admins for select using \( ?is_super_admin\(\) ?\)/,
    );
    // No insert/update/delete/for-all policy: the roster changes only through the
    // service role (T92), never from the browser, so it cannot be self-escalated.
    expect(sql).not.toMatch(/create policy "[^"]*" on platform_admins for insert/);
    expect(sql).not.toMatch(/create policy "[^"]*" on platform_admins for update/);
    expect(sql).not.toMatch(/create policy "[^"]*" on platform_admins for delete/);
    expect(sql).not.toMatch(/create policy "[^"]*" on platform_admins for all/);
  });

  for (const table of CROSS_TENANT_READ_TABLES) {
    it(`${table} grants a cross-tenant READ to platform admins, gated on is_super_admin()`, () => {
      const policy = new RegExp(
        `create policy "[^"]*" on ${table} for select using \\( ?is_super_admin\\(\\) ?\\)`,
      );
      expect(policy.test(sql)).toBe(true);
    });
  }

  it('the platform tier grants cross-tenant READ only — is_super_admin() never gates a write', () => {
    // Every policy that references is_super_admin() must be a `for select` policy
    // (or carry no action verb, which defaults to ALL — forbid that too). So a
    // platform admin can read across tenants but never insert/update/delete/manage.
    const policyStmts = sql.match(/create policy[^;]*?is_super_admin\(\)[^;]*/g) ?? [];
    expect(policyStmts.length).toBeGreaterThanOrEqual(CROSS_TENANT_READ_TABLES.length + 1);
    for (const stmt of policyStmts) {
      expect(stmt).toContain(' for select ');
      expect(stmt).not.toMatch(/ for (all|insert|update|delete) /);
    }
  });

  it('the cross-tenant reads are additive permissive policies that do not weaken member scope', () => {
    // The membership helpers and the standard read gate are untouched: the
    // superadmin policies are SEPARATE named policies, never a rewrite of the
    // member policies, and never an unconditional `using (true)`.
    expect(sql).not.toMatch(/using \( ?true ?\)/);
    // The original tenant-scoped reads still exist alongside the new ones.
    expect(sql).toContain('create policy "members read asociatie" on asociatii for select');
    expect(sql).toContain('create policy "read own memberships" on memberships for select');
  });
});
