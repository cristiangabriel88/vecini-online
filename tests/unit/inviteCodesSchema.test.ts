import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { INVITABLE_ROLES } from '@/features/invites/inviteLogic';

// Regression guard for T60: the live invite_codes table must carry the `role`
// and `single_use` columns the offline invite model (inviteLogic) relies on, so
// the future live persistence (T55) can round-trip the full local model. This
// reads the migration SQL (backend-free, runs offline in CI) and asserts the
// columns exist with the intended defaults and that the role check constraint
// admits exactly the invitable roles — never a founder/platform role.

const migrationsDir = join(process.cwd(), 'supabase', 'migrations');

function allMigrationSql(): string {
  return readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => readFileSync(join(migrationsDir, f), 'utf8'))
    .join('\n');
}

describe('invite_codes role + single_use schema parity (T60)', () => {
  const sql = allMigrationSql().toLowerCase();

  it('adds a role column to invite_codes idempotently with a default', () => {
    expect(sql).toMatch(
      /alter table invite_codes add column if not exists role text not null default 'proprietar'/,
    );
  });

  it('adds a single_use column to invite_codes idempotently defaulting to true', () => {
    expect(sql).toMatch(
      /alter table invite_codes add column if not exists single_use boolean not null default true/,
    );
  });

  it('restricts role to exactly the invitable roles via a check constraint', () => {
    // The constraint is dropped-if-exists before being added, so it is safe to
    // re-run.
    expect(sql).toContain('drop constraint if exists invite_codes_role_check');

    const matches = [
      ...sql.matchAll(/add constraint invite_codes_role_check\s+check \(role in \(([^)]*)\)\)/g),
    ];
    expect(matches.length).toBeGreaterThan(0);
    // The last ADD CONSTRAINT is the effective definition after all migrations run.
    const lastRoles = matches[matches.length - 1][1];

    const constrained = (lastRoles.match(/'([^']+)'/g) ?? [])
      .map((q: string) => q.replace(/'/g, ''))
      .sort();
    const expected = [...INVITABLE_ROLES].sort();
    expect(constrained).toEqual(expected);
  });

  it('never admits a founder/platform role through the constraint', () => {
    const matches = [
      ...sql.matchAll(/add constraint invite_codes_role_check\s+check \(role in \(([^)]*)\)\)/g),
    ];
    expect(matches.length).toBeGreaterThan(0);
    const lastRoles = matches[matches.length - 1][1];
    expect(lastRoles).not.toContain("'admin'");
    expect(lastRoles).not.toContain("'super_admin'");
  });
});
