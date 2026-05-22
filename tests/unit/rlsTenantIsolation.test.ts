import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// T04 — RLS & tenant-isolation guard. Cross-tenant isolation rests on a small
// set of invariants in the migration SQL: the membership helpers must scope by
// BOTH the current user and the target asociatie, the standard RLS macro must
// gate reads through is_member(asociatie_id) and writes through the privileged
// role set, and no policy anywhere may open a table with `using (true)`. This
// test (backend-free, runs offline in CI) fails the moment any of those is
// weakened, complementing the T34 vote/signature guard and the live
// cross-tenant tests queued in T08. Table-by-table coverage is T35.

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

describe('RLS tenant-isolation invariants (T04)', () => {
  const sql = flatten(allMigrationSql());

  it('is_member scopes by both the current user and the target asociatie', () => {
    const fn = sql.match(/create or replace function is_member\(target uuid\)[^$]*\$\$(.*?)\$\$/s);
    expect(fn, 'is_member must be defined').not.toBeNull();
    const body = fn![1];
    expect(body).toContain('m.user_id = auth.uid()');
    expect(body).toContain('m.asociatie_id = target');
    expect(body).toContain('m.ended_at is null');
  });

  it('is_member and has_role are security definer with a fixed search_path', () => {
    // Otherwise a malicious search_path could shadow the memberships table.
    expect(sql).toContain(
      'function is_member(target uuid) returns boolean language sql stable security definer set search_path = public',
    );
    expect(sql).toContain(
      'function has_role(target uuid, roles text[]) returns boolean language sql stable security definer set search_path = public',
    );
  });

  it('has_role scopes by user, asociatie, and the requested roles', () => {
    const fn = sql.match(
      /create or replace function has_role\(target uuid, roles text\[\]\)[^$]*\$\$(.*?)\$\$/s,
    );
    expect(fn, 'has_role must be defined').not.toBeNull();
    const body = fn![1];
    expect(body).toContain('m.user_id = auth.uid()');
    expect(body).toContain('m.asociatie_id = target');
    expect(body).toContain('m.role = any(roles)');
  });

  it('apply_standard_rls enables RLS, gates reads on is_member and writes on the privileged roles', () => {
    const fn = sql.match(
      /create or replace function apply_standard_rls\(tbl regclass\)(.*?)end \$\$/s,
    );
    expect(fn, 'apply_standard_rls must be defined').not.toBeNull();
    const body = fn![1];
    expect(body).toContain('enable row level security');
    expect(body).toContain('for select using (is_member(asociatie_id))');
    expect(body).toContain("has_role(asociatie_id, array['admin','presedinte','comitet'])");
  });

  it('apply_owner_rls confines management to the row owner', () => {
    const fn = sql.match(
      /create or replace function apply_owner_rls\(tbl regclass, owner_col text\)(.*?)end \$\$/s,
    );
    expect(fn, 'apply_owner_rls must be defined').not.toBeNull();
    expect(fn![1]).toContain('= auth.uid()');
  });

  it('no policy opens a table unconditionally with using (true)', () => {
    expect(sql).not.toMatch(/using \( true \)/);
    expect(sql).not.toMatch(/using \(true\)/);
  });
});
