import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// Regression guard for T71: a junction/child table that has NO asociatie_id of
// its own (its tenant is known only through a feature parent) but references
// apartments directly must not be able to attach to an apartment in another
// asociatie. T46's composite FK cannot cover these (there is no asociatie_id on
// the child to tie into the key), so migration 15 adds a trigger that asserts
// apartment.asociatie_id = parent.asociatie_id. This test is backend-free (it
// parses the migration SQL, runs offline in CI): it derives every qualifying
// (child, apartment_col, parent) triple straight from the schema and asserts the
// migration covers EXACTLY that set, so a future apartment-referencing junction
// table cannot be added without a matching guard.

const migrationsDir = join(process.cwd(), 'supabase', 'migrations');
const TRIGGER_MIGRATION = '20260522000015_apartment_ref_tenant_consistency.sql';

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
// which tables carry a direct asociatie_id column and every inline uuid FK.
function parseSchema(): { hasAsociatie: Set<string>; fks: Fk[] } {
  const sql = stripLineComments(allMigrationSql());
  const hasAsociatie = new Set<string>();
  const fks: Fk[] = [];

  const tableRe = /create table (?:if not exists )?(\w+)\s*\(([\s\S]*?)\n\);/gi;
  let m: RegExpExecArray | null;
  while ((m = tableRe.exec(sql)) !== null) {
    const table = m[1];
    const body = m[2];

    if (/\basociatie_id\s+uuid\b/i.test(body)) {
      hasAsociatie.add(table);
    }

    const fkRe = /(\w+)\s+\buuid\b[^,]*?\breferences\s+(\w+)\s*\(/gi;
    let f: RegExpExecArray | null;
    while ((f = fkRe.exec(body)) !== null) {
      fks.push({ child: table, col: f[1], parent: f[2] });
    }
  }

  return { hasAsociatie, fks };
}

interface Trigger {
  child: string;
  apartmentCol: string;
  parent: string;
  parentFkCol: string;
}

// The qualifying triples: the child references apartments via a non-asociatie_id
// column, the child has NO asociatie_id of its own (otherwise T46's composite FK
// already covers it), and the child has exactly one OTHER FK to a tenant-scoped
// parent (a table that carries asociatie_id) which provides the comparison
// anchor. apartment_residents is excluded because its only tenant anchor IS the
// apartment, so there is no second parent to keep consistent with.
function expectedTriggers(): Trigger[] {
  const { hasAsociatie, fks } = parseSchema();
  const triggers: Trigger[] = [];

  const apartmentRefs = fks.filter(
    (fk) =>
      fk.parent === 'apartments' &&
      fk.col !== 'asociatie_id' &&
      !hasAsociatie.has(fk.child),
  );

  for (const ref of apartmentRefs) {
    const tenantParents = fks.filter(
      (fk) =>
        fk.child === ref.child &&
        fk.parent !== 'apartments' &&
        hasAsociatie.has(fk.parent),
    );
    // Exactly one tenant-scoped non-apartment parent is the unambiguous anchor.
    if (tenantParents.length === 1) {
      triggers.push({
        child: ref.child,
        apartmentCol: ref.col,
        parent: tenantParents[0].parent,
        parentFkCol: tenantParents[0].col,
      });
    }
  }

  return triggers;
}

function triggerKey(t: Trigger): string {
  return `${t.child}.${t.apartmentCol}->${t.parent}(${t.parentFkCol})`;
}

describe('apartment-reference tenant-consistency triggers (T71)', () => {
  const migration = readFileSync(join(migrationsDir, TRIGGER_MIGRATION), 'utf8');
  const lower = migration.toLowerCase();

  // Every add_apartment_tenant_trigger('child','apt_col','parent','parent_fk') call.
  const calls: Trigger[] = [
    ...migration.matchAll(
      /add_apartment_tenant_trigger\('(\w+)',\s*'(\w+)',\s*'(\w+)',\s*'(\w+)'\)/g,
    ),
  ].map((c) => ({ child: c[1], apartmentCol: c[2], parent: c[3], parentFkCol: c[4] }));

  it('derives the qualifying apartment-ref junction tables from the schema', () => {
    const keys = expectedTriggers().map(triggerKey);
    // The known instances from T71, plus idea_votes found while auditing.
    expect(keys).toContain('aga_votes.apartment_id->agas(aga_id)');
    expect(keys).toContain('aga_attendees.apartment_id->agas(aga_id)');
    expect(keys).toContain('aga_attendees.proxy_for_apartment_id->agas(aga_id)');
    expect(keys).toContain('budget_votes.apartment_id->budget_proposals(proposal_id)');
    expect(keys).toContain('idea_votes.apartment_id->ideas(idea_id)');
    expect(keys).toContain('petition_signatures.apartment_id->petitions(petition_id)');
  });

  it('guards exactly the qualifying triples (none missing, no stray guard)', () => {
    const callKeys = [...new Set(calls.map(triggerKey))].sort();
    const expectedKeys = [...new Set(expectedTriggers().map(triggerKey))].sort();
    expect(callKeys).toEqual(expectedKeys);
  });

  it('excludes tables already covered by T46 (those carrying their own asociatie_id)', () => {
    const guarded = new Set(calls.map((c) => c.child));
    // votes / tickets / bookings / parking_assignments etc. carry asociatie_id
    // and are covered by the T46 composite FK, so they must not appear here.
    expect(guarded.has('votes')).toBe(false);
    expect(guarded.has('tickets')).toBe(false);
    expect(guarded.has('priority_rankings')).toBe(false);
  });

  it('excludes apartment_residents (apartment is its only tenant anchor)', () => {
    const guarded = new Set(calls.map((c) => c.child));
    expect(guarded.has('apartment_residents')).toBe(false);
  });

  it('enforces equality of the parent and apartment asociatie_id in the check function', () => {
    expect(lower).toContain('select asociatie_id from %i where id = $1');
    expect(lower).toContain('select asociatie_id into apartment_asoc from apartments where id = apartment_id');
    expect(lower).toContain('parent_asoc <> apartment_asoc');
  });

  it('allows a null apartment reference (optional link is not enforced)', () => {
    expect(lower).toContain('if apartment_id is null then');
    expect(lower).toContain('return new');
  });

  it('runs the check security definer with a fixed search_path', () => {
    const fn = /create or replace function check_apartment_parent_tenant\(\)[\s\S]*?security definer set search_path = public/i;
    expect(fn.test(migration)).toBe(true);
  });

  it('fires on insert and update, and is idempotent (guarded on pg_trigger)', () => {
    expect(lower).toContain('before insert or update on %i');
    const guard = /if not exists \([\s\S]*?pg_trigger[\s\S]*?tgname = trg_name[\s\S]*?\) then/;
    expect(guard.test(lower)).toBe(true);
  });
});
