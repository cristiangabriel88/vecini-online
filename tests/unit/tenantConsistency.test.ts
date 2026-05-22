import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// Regression guard for T46: a child row that references a parent row must not be
// able to attach to a parent in another asociație. Where both the child and the
// parent carry a direct asociatie_id, migration 14 adds a COMPOSITE foreign key
// on (fk_col, asociatie_id) -> parent(id, asociatie_id) so the tenants must
// match. This test is backend-free (it parses the migration SQL, runs offline in
// CI): it derives every qualifying parent-child pair straight from the schema and
// asserts the migration covers EXACTLY that set, so a future child table that
// carries asociatie_id and references a tenant-scoped parent cannot be added
// without a matching guard.

const migrationsDir = join(process.cwd(), 'supabase', 'migrations');
const TENANT_FK_MIGRATION = '20260522000014_tenant_consistency_fk.sql';

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

interface Fk {
  child: string;
  col: string;
  parent: string;
}

// Parse every `create table NAME ( ... );` block across the suite, recording
// which tables carry a direct asociatie_id column and every inline uuid FK
// (column -> referenced table).
function parseSchema(): { hasAsociatie: Set<string>; fks: Fk[] } {
  const sql = stripLineComments(allMigrationSql());
  const hasAsociatie = new Set<string>();
  const fks: Fk[] = [];

  const tableRe = /create table (?:if not exists )?(\w+)\s*\(([\s\S]*?)\n\);/gi;
  let m: RegExpExecArray | null;
  while ((m = tableRe.exec(sql)) !== null) {
    const table = m[1];
    const body = m[2];

    // A direct tenant column, e.g. `asociatie_id uuid not null references ...`.
    if (/\basociatie_id\s+uuid\b/i.test(body)) {
      hasAsociatie.add(table);
    }

    // Inline uuid foreign keys. `[^,]` keeps each match inside one column def, so
    // the captured column name is the one that actually carries the reference.
    const fkRe = /(\w+)\s+\buuid\b[^,]*?\breferences\s+(\w+)\s*\(/gi;
    let f: RegExpExecArray | null;
    while ((f = fkRe.exec(body)) !== null) {
      fks.push({ child: table, col: f[1], parent: f[2] });
    }
  }

  return { hasAsociatie, fks };
}

// The qualifying pairs: child and parent both carry asociatie_id, and the FK is
// not the asociatie_id column itself pointing at the tenant root.
function expectedPairs(): Fk[] {
  const { hasAsociatie, fks } = parseSchema();
  return fks.filter(
    (fk) =>
      fk.col !== 'asociatie_id' &&
      hasAsociatie.has(fk.child) &&
      hasAsociatie.has(fk.parent),
  );
}

function pairKey(fk: Fk): string {
  return `${fk.child}.${fk.col}->${fk.parent}`;
}

describe('parent-child tenant-consistency guards (T46)', () => {
  const migration = readFileSync(join(migrationsDir, TENANT_FK_MIGRATION), 'utf8');
  const lower = migration.toLowerCase();

  // Every add_tenant_fk('child','col','parent') call in the migration.
  const calls: Fk[] = [...migration.matchAll(/add_tenant_fk\('(\w+)',\s*'(\w+)',\s*'(\w+)'\)/g)].map(
    (c) => ({ child: c[1], col: c[2], parent: c[3] }),
  );

  it('parses a non-trivial set of qualifying parent-child pairs from the schema', () => {
    // Sanity: the parser actually found tenant-scoped tables and FKs, and the
    // known examples from the task are among them.
    const keys = expectedPairs().map(pairKey);
    expect(keys.length).toBeGreaterThan(20);
    expect(keys).toContain('discussion_messages.thread_id->discussion_threads');
    expect(keys).toContain('budget_proposals.cycle_id->budget_cycles');
    expect(keys).toContain('votes.poll_id->polls');
  });

  it('guards every qualifying parent-child pair (no tenant-crossing reference is left open)', () => {
    const callKeys = new Set(calls.map(pairKey));
    for (const pair of expectedPairs()) {
      expect(callKeys.has(pairKey(pair))).toBe(true);
    }
  });

  it('covers exactly the qualifying pairs (no stray guard, none missing)', () => {
    const callKeys = [...new Set(calls.map(pairKey))].sort();
    const expectedKeys = [...new Set(expectedPairs().map(pairKey))].sort();
    expect(callKeys).toEqual(expectedKeys);
  });

  it('does not guard tables that lack their own asociatie_id (parent-scoped junctions)', () => {
    // e.g. aga_votes / budget_votes / petition_signatures carry no direct
    // asociatie_id, so there is nothing to keep equal; they must not appear.
    const guarded = new Set(calls.map((c) => c.child));
    expect(guarded.has('aga_votes')).toBe(false);
    expect(guarded.has('budget_votes')).toBe(false);
    expect(guarded.has('petition_signatures')).toBe(false);
  });

  it('enforces tenant equality via a composite FK on (fk_col, asociatie_id) -> parent(id, asociatie_id)', () => {
    const fkBody = new RegExp(
      'foreign key \\(%i, asociatie_id\\)\\s*\'\\s*\\|\\|\\s*\'references %i \\(id, asociatie_id\\)',
    );
    expect(fkBody.test(lower)).toBe(true);
  });

  it('creates the parent unique (id, asociatie_id) target the composite FK needs', () => {
    expect(lower).toContain('add constraint %i unique (id, asociatie_id)');
  });

  it('is idempotent: both the unique target and the FK are guarded on pg_constraint', () => {
    const uniqueGuard = /if not exists \([\s\S]*?pg_constraint[\s\S]*?conname = parent_uniq[\s\S]*?\) then/;
    const fkGuard = /if not exists \([\s\S]*?pg_constraint[\s\S]*?conname = fk_name[\s\S]*?\) then/;
    expect(uniqueGuard.test(lower)).toBe(true);
    expect(fkGuard.test(lower)).toBe(true);
  });

  it('does not weaken existing delete behaviour (no on delete cascade on the composite FK)', () => {
    // The composite FK uses the default ON DELETE NO ACTION so it never turns a
    // restricting parent FK into a cascading one; existing cascades still run.
    expect(lower).not.toContain('on delete cascade');
  });
});
