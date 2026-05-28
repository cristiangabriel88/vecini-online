import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// Regression guard for T111: the memberships.role check constraint must never
// admit 'super_admin'. The platform tier lives in platform_admins +
// is_super_admin() -- not in a per-asociatie membership role. This test reads
// the migration SQL offline and asserts the effective constraint (the last
// definition applied across the ordered suite) covers exactly the six tenant
// roles, no more, no less.

const migrationsDir = join(process.cwd(), 'supabase', 'migrations');

function allMigrationSql(): string {
  return readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => readFileSync(join(migrationsDir, f), 'utf8'))
    .join('\n')
    .toLowerCase();
}

const TENANT_ROLES = ['admin', 'comitet', 'cenzor', 'chirias', 'presedinte', 'proprietar'];

describe('memberships.role check excludes super_admin (T111)', () => {
  const sql = allMigrationSql();

  it('drops the original constraint before recreating it (idempotent)', () => {
    expect(sql).toContain('drop constraint if exists memberships_role_check');
  });

  it('effective constraint does not admit super_admin', () => {
    const matches = [
      ...sql.matchAll(/add constraint memberships_role_check\s+check \(role in \(([^)]*)\)\)/g),
    ];
    expect(matches.length).toBeGreaterThan(0);
    // The last ADD CONSTRAINT is the effective definition after all migrations run.
    const lastRoles = matches[matches.length - 1][1];
    expect(lastRoles).not.toContain("'super_admin'");
  });

  it('effective constraint covers exactly the six per-asociatie tenant roles', () => {
    const matches = [
      ...sql.matchAll(/add constraint memberships_role_check\s+check \(role in \(([^)]*)\)\)/g),
    ];
    const lastRoles = matches[matches.length - 1][1];
    const constrained = (lastRoles.match(/'([^']+)'/g) ?? [])
      .map((q: string) => q.replace(/'/g, ''))
      .sort();
    expect(constrained).toEqual([...TENANT_ROLES].sort());
  });

  it('no RLS policy gates on has_role(..., super_admin) as a membership value', () => {
    // Platform access must go through is_super_admin(), never through a
    // membership role value, so has_role with 'super_admin' must not appear.
    expect(sql).not.toMatch(/has_role\s*\([^)]*'super_admin'/);
  });
});
