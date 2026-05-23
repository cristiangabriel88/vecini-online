import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// T35 — Automated RLS-coverage guard. T34 happened because three tables
// (budget_votes / idea_votes / petition_signatures) shipped with RLS never
// enabled and nothing caught it: in Postgres a table with row level security
// OFF is fully readable/writable by anyone PostgREST authenticates, and any
// policy attached to it is silently ignored. This backend-free test (parses the
// migration SQL, runs offline in CI) collects every `create table` in the public
// schema and asserts each one is later RLS-enabled, so a future migration cannot
// reintroduce the class of bug. It complements the invariant guard in
// rlsTenantIsolation.test.ts (T04) and the column guard in
// rlsHelperColumns.test.ts (T70); live cross-tenant tests remain T08.
//
// A table's RLS is *enabled* in exactly two ways in this schema:
//   1. a direct `alter table X enable row level security` statement, or
//   2. a `select apply_standard_rls('X')` call (the macro runs that same
//      `enable row level security` before adding its member/comitet policies).
// The other macros — apply_owner_rls / reapply_owner_rls / apply_member_insert_rls
// / apply_governance_owner_rls — only ADD a policy; they do NOT enable RLS. So a
// table reaching one of those without (1) or (2) would have its policy silently
// ignored and the table left wide open — a guard below catches exactly that.

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

// Every `create table [if not exists] NAME` in the public schema. Schema-qualified
// names (e.g. `storage.objects`) are not public app tables and are excluded; none
// exist today, but the filter keeps the guard honest if one is ever added.
function parseCreatedTables(sql: string): Set<string> {
  const tables = new Set<string>();
  for (const m of sql.matchAll(/create table (?:if not exists )?([\w.]+)/gi)) {
    const name = m[1];
    if (name.includes('.')) continue;
    tables.add(name);
  }
  return tables;
}

// Tables whose RLS is actually turned on: a direct `enable row level security`
// (the `%s` placeholder inside the apply_standard_rls macro body is not a word
// char, so the macro definition itself is correctly NOT counted here) or a
// `select apply_standard_rls('X')` call (which enables RLS before adding policies).
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

// Tables that receive ONLY a policy from a non-enabling macro. If such a table is
// not also RLS-enabled, the policy is dead and the table is open.
function parsePolicyOnlyTargets(sql: string): Set<string> {
  const targets = new Set<string>();
  const patterns = [
    /apply_owner_rls\('(\w+)',/gi,
    /reapply_owner_rls\('(\w+)',/gi,
    /apply_member_insert_rls\('(\w+)',/gi,
    /apply_governance_owner_rls\('(\w+)'/gi,
  ];
  for (const re of patterns) {
    for (const m of sql.matchAll(re)) targets.add(m[1]);
  }
  return targets;
}

describe('RLS coverage — every public table has row level security enabled (T35)', () => {
  const sql = allMigrationSql();
  const tables = parseCreatedTables(sql);
  const enabled = parseRlsEnabled(sql);
  const policyOnly = parsePolicyOnlyTargets(sql);

  it('parses a non-trivial schema (the whole feature surface, not a stub)', () => {
    expect(tables.size).toBeGreaterThan(100);
    // Sanity anchors: a core table, a feature table, and a recent GDPR table.
    expect(tables.has('memberships')).toBe(true);
    expect(tables.has('announcements')).toBe(true);
    expect(tables.has('data_breaches')).toBe(true);
  });

  it('recognises both RLS-enabling mechanisms', () => {
    // Via the apply_standard_rls macro:
    expect(enabled.has('announcements')).toBe(true);
    // Via a direct `enable row level security` (T34 vote/signature tables and the
    // GDPR tables enable RLS directly, not through the macro):
    expect(enabled.has('budget_votes')).toBe(true);
    expect(enabled.has('idea_votes')).toBe(true);
    expect(enabled.has('petition_signatures')).toBe(true);
    expect(enabled.has('data_breaches')).toBe(true);
  });

  it('EVERY created public table has RLS enabled (the T34 bug class)', () => {
    const uncovered = [...tables].filter((t) => !enabled.has(t)).sort();
    expect(uncovered, `tables created but never RLS-enabled: ${uncovered.join(', ')}`).toEqual([]);
  });

  it('every owner/member-insert/governance policy target is also RLS-enabled (a policy on an RLS-off table is silently ignored)', () => {
    expect(policyOnly.size).toBeGreaterThan(20);
    const deadPolicies = [...policyOnly].filter((t) => !enabled.has(t)).sort();
    expect(
      deadPolicies,
      `tables given a policy via a non-enabling macro but never RLS-enabled: ${deadPolicies.join(', ')}`,
    ).toEqual([]);
  });

  it('the policy-only macros never enable RLS by themselves (only apply_standard_rls and direct statements do)', () => {
    // Guards the test's own assumption: if a future edit made e.g. apply_owner_rls
    // enable RLS, the coverage logic above would need revisiting. The macro bodies
    // for owner/member-insert/governance contain only `create policy`, no
    // `enable row level security`.
    const ownerBody = sql.match(
      /create or replace function apply_owner_rls\(tbl regclass, owner_col text\)([\s\S]*?)end \$\$/i,
    );
    expect(ownerBody, 'apply_owner_rls must be defined').not.toBeNull();
    expect(ownerBody![1].toLowerCase()).not.toContain('enable row level security');

    const memberBody = sql.match(
      /create or replace function apply_member_insert_rls\(tbl regclass, owner_col text\)([\s\S]*?)end \$\$/i,
    );
    expect(memberBody, 'apply_member_insert_rls must be defined').not.toBeNull();
    expect(memberBody![1].toLowerCase()).not.toContain('enable row level security');
  });
});
