import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// Regression guard for T70. The RLS macros generate policies that reference
// fixed columns:
//   apply_standard_rls('X')           -> is_member(asociatie_id) / has_role(asociatie_id, ...)
//   apply_member_insert_rls('X', col) -> is_member(asociatie_id) and col = auth.uid()
//   apply_owner_rls('X', col)         -> col = auth.uid()  (and is_member(asociatie_id) after T45)
// So a `create policy` referencing a column the target table does NOT have aborts
// the whole migration on a real Postgres (`column "asociatie_id" does not exist`)
// even though demo mode never runs the SQL. T70 was exactly this: aga_votes is
// scoped through its parent `agas` and carries no asociatie_id, yet it was passed
// to apply_standard_rls. This backend-free test (parses the migration SQL, runs
// offline in CI) asserts every helper call targets a table that actually has the
// column(s) the generated policy references, so the class of bug cannot return.

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
  return readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => readFileSync(join(migrationsDir, f), 'utf8'))
    .join('\n');
}

// Parse every `create table NAME ( ... );` block and record the uuid columns each
// table declares (every column a helper references is a uuid: asociatie_id, plus
// owner columns like user_id / generated_by / reporter_user_id).
function parseTableColumns(): Map<string, Set<string>> {
  const sql = stripLineComments(allMigrationSql());
  const tables = new Map<string, Set<string>>();

  const tableRe = /create table (?:if not exists )?(\w+)\s*\(([\s\S]*?)\n\);/gi;
  let m: RegExpExecArray | null;
  while ((m = tableRe.exec(sql)) !== null) {
    const table = m[1];
    const body = m[2];
    const cols = tables.get(table) ?? new Set<string>();
    // A column definition: an identifier followed by the `uuid` type, anchored to
    // a column boundary (start of body or just after a comma / open paren) so it
    // does not match `references PARENT(id)` mentions inside another column.
    const colRe = /(?:^|[,(])\s*(\w+)\s+uuid\b/gi;
    let c: RegExpExecArray | null;
    while ((c = colRe.exec(body)) !== null) {
      cols.add(c[1]);
    }
    tables.set(table, cols);
  }

  return tables;
}

interface HelperCall {
  helper: string;
  table: string;
  ownerCol?: string;
  // The columns the generated policy references on the target table.
  requires: string[];
}

function parseHelperCalls(): HelperCall[] {
  const sql = stripLineComments(allMigrationSql());
  const calls: HelperCall[] = [];

  for (const m of sql.matchAll(/apply_standard_rls\('(\w+)'\)/g)) {
    calls.push({ helper: 'apply_standard_rls', table: m[1], requires: ['asociatie_id'] });
  }
  for (const m of sql.matchAll(/apply_member_insert_rls\('(\w+)',\s*'(\w+)'\)/g)) {
    calls.push({
      helper: 'apply_member_insert_rls',
      table: m[1],
      ownerCol: m[2],
      requires: ['asociatie_id', m[2]],
    });
  }
  // apply_owner_rls and the T45 reapply_owner_rls both manage the "owner manage"
  // policy; after T45 it references is_member(asociatie_id) too.
  for (const m of sql.matchAll(/(?:re)?apply_owner_rls\('(\w+)',\s*'(\w+)'\)/g)) {
    calls.push({
      helper: 'apply_owner_rls',
      table: m[1],
      ownerCol: m[2],
      requires: ['asociatie_id', m[2]],
    });
  }

  return calls;
}

describe('RLS helper calls reference only columns the target table has (T70)', () => {
  const tables = parseTableColumns();
  const calls = parseHelperCalls();

  it('parses a non-trivial set of helper calls and table columns', () => {
    expect(tables.size).toBeGreaterThan(50);
    expect(calls.length).toBeGreaterThan(20);
    // Sanity: a known owner-scoped table and a known standard table are present.
    expect(tables.get('access_codes')?.has('generated_by')).toBe(true);
    expect(tables.get('announcements')?.has('asociatie_id')).toBe(true);
  });

  it('every helper target table exists in the schema', () => {
    for (const call of calls) {
      expect(tables.has(call.table), `unknown table ${call.table} in ${call.helper}`).toBe(true);
    }
  });

  it('no apply_*_rls call references a column the target table lacks', () => {
    const violations: string[] = [];
    for (const call of calls) {
      const cols = tables.get(call.table);
      if (!cols) continue;
      for (const required of call.requires) {
        if (!cols.has(required)) {
          violations.push(`${call.helper}('${call.table}') needs column "${required}"`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('aga_votes is NOT passed to apply_standard_rls (it has no asociatie_id; scoped through agas)', () => {
    expect(tables.get('aga_votes')?.has('asociatie_id') ?? false).toBe(false);
    const standardTargets = calls
      .filter((c) => c.helper === 'apply_standard_rls')
      .map((c) => c.table);
    expect(standardTargets).not.toContain('aga_votes');
  });
});
