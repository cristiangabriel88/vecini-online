import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// Regression guard for T34: the vote/signature junction tables
// (budget_votes, idea_votes, petition_signatures) once shipped with RLS never
// enabled and zero policies, exposing who voted/signed what across every
// tenant. This test reads the migration SQL (backend-free, runs offline in CI)
// and asserts each table is enabled for RLS and gated through its parent's
// asociatie via is_member, so the class of bug cannot silently return.
// The broader, table-by-table coverage guard across all migrations is T35.

const migrationsDir = join(process.cwd(), 'supabase', 'migrations');

function allMigrationSql(): string {
  return readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => readFileSync(join(migrationsDir, f), 'utf8'))
    .join('\n');
}

describe('vote/signature junction-table RLS (T34)', () => {
  const sql = allMigrationSql().toLowerCase();

  const cases = [
    { table: 'budget_votes', parent: 'budget_proposals' },
    { table: 'idea_votes', parent: 'ideas' },
    { table: 'petition_signatures', parent: 'petitions' },
  ] as const;

  for (const { table, parent } of cases) {
    it(`${table} has row level security enabled`, () => {
      expect(sql).toContain(`alter table ${table} enable row level security`);
    });

    it(`${table} gates access through its parent ${parent} via is_member`, () => {
      // The select and insert policies must resolve the owning asociatie from
      // the parent row and check is_member, never expose rows tenant-wide.
      const selectPolicy = new RegExp(
        `create policy "[^"]*" on ${table} for select using \\([^;]*${parent}[^;]*is_member`,
        's',
      );
      const insertPolicy = new RegExp(
        `create policy "[^"]*" on ${table} for insert with check \\([^;]*${parent}[^;]*is_member`,
        's',
      );
      expect(selectPolicy.test(sql)).toBe(true);
      expect(insertPolicy.test(sql)).toBe(true);
    });

    it(`${table} grants no update or delete policy (cast votes are immutable)`, () => {
      expect(sql).not.toMatch(new RegExp(`create policy "[^"]*" on ${table} for update`));
      expect(sql).not.toMatch(new RegExp(`create policy "[^"]*" on ${table} for delete`));
      // A "for all" policy would implicitly grant update/delete; forbid it too.
      expect(sql).not.toMatch(new RegExp(`create policy "[^"]*" on ${table} for all`));
    });
  }
});
