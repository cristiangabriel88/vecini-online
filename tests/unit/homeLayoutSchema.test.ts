import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// Regression guard for T12 (F67): the live `home_layouts` schema must stay in
// parity with the offline `homeLayoutLogic` model. This reads the migration SQL
// (backend-free, runs offline in CI) and asserts the table is owner-scoped +
// tenant-tightened + RLS-enabled and that there is exactly one layout per
// resident per asociație, so a resident can never read another resident's home
// personalization or stamp a row in an asociație they do not belong to.

const migrationsDir = join(process.cwd(), 'supabase', 'migrations');

function allMigrationSql(): string {
  return readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => readFileSync(join(migrationsDir, f), 'utf8'))
    .join('\n')
    .toLowerCase();
}

describe('home_layouts schema parity (T12 / F67)', () => {
  const sql = allMigrationSql();

  it('creates home_layouts referencing the resident and the asociație, idempotently', () => {
    expect(sql).toContain('create table if not exists home_layouts');
    expect(sql).toMatch(/resident_user_id uuid not null references users\(id\) on delete cascade/);
    expect(sql).toMatch(/asociatie_id uuid not null references asociatii\(id\) on delete cascade/);
    // The ordered card list lives in a jsonb column.
    expect(sql).toMatch(/cards jsonb not null default '\[\]'/);
  });

  it('allows exactly one layout per resident per asociație', () => {
    expect(sql).toContain('unique (resident_user_id, asociatie_id)');
  });

  it('enables RLS and confines management to the row owner who is a tenant member', () => {
    expect(sql).toContain('alter table home_layouts enable row level security');
    expect(sql).toContain('drop policy if exists "self manage own home layout" on home_layouts');
    const match = sql.match(
      /create policy "self manage own home layout" on home_layouts for all\s+using \(resident_user_id = auth\.uid\(\) and is_member\(asociatie_id\)\)\s+with check \(resident_user_id = auth\.uid\(\) and is_member\(asociatie_id\)\)/,
    );
    expect(match, 'owner-only, tenant-tightened for-all policy with using + with check').not.toBeNull();
  });
});
