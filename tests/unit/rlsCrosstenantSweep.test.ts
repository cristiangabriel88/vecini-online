// T279 -- Cross-tenant isolation regression sweep.
// Verifies, without a live database, that every asociatie_id-bearing table scopes
// both read and write access by the row's asociatie_id across every feature domain.
//
// Complements:
//   rlsTenantIsolation.test.ts (T04) -- is_member/has_role helper-function invariants
//   rlsPolicyCoverage.test.ts  (T79) -- every RLS-enabled table has at least one policy

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

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

function flatten(sql: string): string {
  return sql.toLowerCase().replace(/\s+/g, ' ');
}

// Tables whose CREATE TABLE body declares an asociatie_id column.
// Uses paren-depth tracking to extract only the column-definition block,
// avoiding false positives from index or RLS text after the closing ')'.
// Handles schema-qualified names (e.g. public.token_redemption_attempts).
function parseTablesWithAsociatieId(flatSql: string): Set<string> {
  const tables = new Set<string>();
  // Match: create table [if not exists] [schema.]tablename (
  const re = /create table (?:if not exists )?(?:\w+\.)?(\w+) \(/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(flatSql)) !== null) {
    const tableName = m[1];
    // Walk forward tracking paren depth to find just the column-definition block.
    const openPos = m.index + m[0].length - 1; // index of the opening '('
    let depth = 1;
    let i = openPos + 1;
    while (i < flatSql.length && depth > 0) {
      if (flatSql[i] === '(') depth++;
      else if (flatSql[i] === ')') depth--;
      i++;
    }
    const body = flatSql.slice(openPos, i);
    if (body.includes('asociatie_id')) {
      tables.add(tableName);
    }
  }
  return tables;
}

// Tables for which the given RLS macro was called, e.g. apply_standard_rls('table').
function tablesWithMacro(flatSql: string, macroName: string): Set<string> {
  const tables = new Set<string>();
  const re = new RegExp(String.raw`${macroName}\s*\(\s*'(\w+)'`, 'g');
  for (const m of flatSql.matchAll(re)) tables.add(m[1]);
  return tables;
}

// Tables that have at least one explicit CREATE POLICY statement whose body
// (up to the terminating semicolon in the flattened SQL) references asociatie_id.
// Handles schema-qualified table names (e.g. public.subscriptions).
function tablesWithExplicitAsociatieIdPolicy(flatSql: string): Set<string> {
  const tables = new Set<string>();
  const re = /create policy (?:"[^"]*"|'[^']*'|\w+) on (?:only )?(?:\w+\.)?(\w+)\b[^;]+/g;
  for (const m of flatSql.matchAll(re)) {
    if (m[0].includes('asociatie_id')) tables.add(m[1]);
  }
  return tables;
}

// Tables that carry an asociatie_id column but are intentionally scoped by
// auth.uid() (not by tenant) because asociatie_id is optional context rather
// than the isolation key.  Access is isolated at the user level.
const INTENTIONALLY_USER_SCOPED: Record<string, string> = {
  notifications:
    'asociatie_id is nullable context only. Isolation is per-recipient (user_id = auth.uid()): ' +
    'a user can only read their own notifications regardless of which building generated them.',
  safety_codes:
    'Encrypted personal safety codes. Isolation is owner-only (owner_user_id = auth.uid()): ' +
    'a user can only read and manage their own records. asociatie_id is organisational metadata.',
};

describe('Cross-tenant isolation regression sweep (T279)', () => {
  const rawSql = allMigrationSql();
  const flat = flatten(rawSql);
  const tablesWithAsocId = parseTablesWithAsociatieId(flat);
  const standardRlsTables = tablesWithMacro(flat, 'apply_standard_rls');
  const explicitPolicyTables = tablesWithExplicitAsociatieIdPolicy(flat);
  const coveredTables = new Set([...standardRlsTables, ...explicitPolicyTables]);

  // ── Group A: Structural guard ──────────────────────────────────────────────
  // Any new table that ships with an asociatie_id column but without proper
  // isolation will fail one of these tests, making this a permanent ratchet.

  describe('structural guard -- every new asociatie_id table must have isolation', () => {
    it('parses a meaningful number of asociatie_id-bearing tables (schema not a stub)', () => {
      expect(tablesWithAsocId.size).toBeGreaterThan(60);
    });

    it('every table with an asociatie_id column is covered by apply_standard_rls, explicit scoped policies, or the user-scoped allowlist', () => {
      const unprotected = [...tablesWithAsocId]
        .filter((t) => !coveredTables.has(t) && !(t in INTENTIONALLY_USER_SCOPED))
        .sort();
      expect(
        unprotected,
        `Tables with asociatie_id but no tenant-scoped isolation and not in allowlist: ` +
          `${unprotected.join(', ')}. Either add apply_standard_rls('table'), explicit ` +
          `asociatie_id-scoped policies, or document the exception in INTENTIONALLY_USER_SCOPED.`,
      ).toEqual([]);
    });

    it('INTENTIONALLY_USER_SCOPED allowlist has no stale entries (every listed table still has an asociatie_id column)', () => {
      const stale = Object.keys(INTENTIONALLY_USER_SCOPED).filter((t) => !tablesWithAsocId.has(t));
      expect(
        stale,
        `Stale INTENTIONALLY_USER_SCOPED entries (table removed or asociatie_id column dropped): ` +
          `${stale.join(', ')}`,
      ).toEqual([]);
    });

    it('apply_governance_owner_rls macro gates all owner grants on is_member(asociatie_id)', () => {
      const macroStart = flat.indexOf('create or replace function apply_governance_owner_rls');
      expect(macroStart, 'apply_governance_owner_rls must be defined').toBeGreaterThan(-1);
      // The macro body defines 3 policies (insert + update + delete) that all require
      // is_member(asociatie_id); 2000 chars covers the full function body.
      const body = flat.slice(macroStart, macroStart + 2000);
      const count = (body.match(/is_member\(asociatie_id\)/g) ?? []).length;
      expect(
        count,
        'apply_governance_owner_rls must reference is_member(asociatie_id) in all three owner grants',
      ).toBeGreaterThanOrEqual(3);
    });

    it('apply_owner_rls macro (post T45 tightening) includes is_member(asociatie_id)', () => {
      // The tightened macro redefined in 20260522000013 must include the membership check
      // in both USING and WITH CHECK so that an owner cannot write to a foreign tenant.
      expect(flat).toContain('using (%i = auth.uid() and is_member(asociatie_id))');
      expect(flat).toContain('with check (%i = auth.uid() and is_member(asociatie_id))');
    });

    it('apply_member_insert_rls macro gates INSERT on is_member(asociatie_id)', () => {
      expect(flat).toContain('with check (is_member(asociatie_id) and %i = auth.uid())');
    });
  });

  // ── Group B: Read isolation per feature domain ────────────────────────────
  // Spot-checks one representative table per domain cluster; the structural
  // guard above ensures global coverage.

  describe('read isolation -- representative tables (one per feature domain)', () => {
    // Core tables use explicit CREATE POLICY (not the apply_standard_rls macro).
    it('apartments (core housing) has explicit is_member(asociatie_id) SELECT policy', () => {
      expect(
        coveredTables.has('apartments'),
        'apartments must have an asociatie_id-scoped policy for SELECT',
      ).toBe(true);
      expect(flat).toMatch(/on apartments for select using \(is_member\(asociatie_id\)\)/);
    });

    it('invite_codes (core auth) has explicit has_role(asociatie_id) policy', () => {
      expect(coveredTables.has('invite_codes')).toBe(true);
      expect(flat).toMatch(/on invite_codes for all using \(has_role\(asociatie_id,/);
    });

    // Feature tables use apply_standard_rls for SELECT.
    const STANDARD_RLS_DOMAINS: ReadonlyArray<[string, string]> = [
      ['announcements', 'F01 communications'],
      ['discussion_threads', 'F02 discussions'],
      ['discussion_messages', 'F02 discussions (also has owner policy)'],
      ['anonymous_messages', 'F05 anonymous messaging'],
      ['agas', 'F10 governance'],
      ['petitions', 'F16 governance'],
      ['tickets', 'F17 support'],
      ['meter_readings', 'F21 utilities'],
      ['rfps', 'F22 procurement'],
      ['duty_schedule', 'F23 communal duties'],
      ['lending_items', 'F24 lending'],
      ['documents', 'F33 documents'],
      ['marketplace_listings', 'F57 community marketplace'],
      ['private_threads', 'F04 private messaging'],
    ];

    for (const [table, domain] of STANDARD_RLS_DOMAINS) {
      it(`${table} (${domain}) is protected by apply_standard_rls`, () => {
        expect(
          standardRlsTables.has(table),
          `apply_standard_rls('${table}') not found -- ${domain} reads are not tenant-scoped`,
        ).toBe(true);
      });
    }

    it('petition_signatures SELECT scopes through parent petitions.asociatie_id', () => {
      expect(flat).toMatch(
        /create policy[^;]+on petition_signatures for select using[^;]+is_member\(pt\.asociatie_id\)/,
      );
    });

    it('idea_votes SELECT scopes through parent ideas.asociatie_id', () => {
      expect(flat).toMatch(
        /create policy[^;]+on idea_votes for select using[^;]+is_member\(i\.asociatie_id\)/,
      );
    });

    it('budget_votes SELECT scopes through parent budget_proposals.asociatie_id', () => {
      expect(flat).toMatch(
        /create policy[^;]+on budget_votes for select using[^;]+is_member\(p\.asociatie_id\)/,
      );
    });

    it('ticket_attachments SELECT scopes through parent tickets.asociatie_id', () => {
      expect(flat).toMatch(
        /create policy[^;]+on ticket_attachments for select using[^;]+is_member\([^)]*asociatie_id\)/,
      );
    });
  });

  // ── Group C: Write isolation -- member-accessible write paths ─────────────
  // The "comitet write" (for all) policy set up by apply_standard_rls covers most
  // write paths; these tests cover the additional member-level INSERT/UPDATE grants
  // that were added per feature to let residents contribute data.

  describe('write isolation -- member-accessible INSERT / UPDATE paths', () => {
    it('meter_readings member INSERT is scoped by is_member(asociatie_id)', () => {
      expect(flat).toMatch(
        /on meter_readings for insert with check \(is_member\(asociatie_id\)/,
      );
    });

    it('rfp_quotes member INSERT is scoped by is_member(asociatie_id)', () => {
      expect(flat).toMatch(
        /on rfp_quotes for insert with check \(is_member\(asociatie_id\)/,
      );
    });

    it('duty_schedule member UPDATE requires is_member(asociatie_id) in both USING and WITH CHECK', () => {
      expect(flat).toMatch(
        /on duty_schedule for update using \(is_member\(asociatie_id\)\) with check \(is_member\(asociatie_id\)\)/,
      );
    });

    it('lending_items member UPDATE requires is_member(asociatie_id) in both USING and WITH CHECK', () => {
      expect(flat).toMatch(
        /on lending_items for update using \(is_member\(asociatie_id\)\) with check \(is_member\(asociatie_id\)\)/,
      );
    });

    it('visitor_reports member INSERT is handled by apply_member_insert_rls (is_member gated)', () => {
      expect(flat).toContain("apply_member_insert_rls('visitor_reports'");
    });

    it('survey_responses member INSERT is handled by apply_member_insert_rls (is_member gated)', () => {
      expect(flat).toContain("apply_member_insert_rls('survey_responses'");
    });

    it('ticket_attachments reporter INSERT scopes through parent ticket is_member', () => {
      expect(flat).toMatch(
        /on ticket_attachments for insert with check \( exists \( select 1 from tickets t where t\.id = ticket_id and[^;]+is_member\(t\.asociatie_id\)/,
      );
    });

    it('petition_signatures INSERT scopes through parent petitions.asociatie_id', () => {
      expect(flat).toMatch(
        /on petition_signatures for insert with check[^;]+is_member\(pt\.asociatie_id\)/,
      );
    });

    it('idea_votes INSERT scopes through parent ideas.asociatie_id', () => {
      expect(flat).toMatch(
        /on idea_votes for insert with check[^;]+is_member\(i\.asociatie_id\)/,
      );
    });

    it('budget_votes INSERT scopes through parent budget_proposals.asociatie_id', () => {
      expect(flat).toMatch(
        /on budget_votes for insert with check[^;]+is_member\(p\.asociatie_id\)/,
      );
    });
  });

  // ── Group D: Tricky surfaces ──────────────────────────────────────────────

  describe('tricky surfaces -- anonymous messages, votes after lock, private threads', () => {
    it('anonymous_messages: over-permissive "members read" policy was dropped', () => {
      // The base migration adds the standard "members read" policy.
      // The T137 privacy migration must drop it so that non-owners cannot read
      // sender_user_id through PostgREST.
      const drops = (
        flat.match(/drop policy if exists "members read" on anonymous_messages/g) ?? []
      ).length;
      expect(
        drops,
        'The "members read" policy on anonymous_messages must have been dropped by the T137 privacy migration',
      ).toBeGreaterThanOrEqual(1);
    });

    it('anonymous_messages: reapply_owner_rls was applied (owner policy includes is_member)', () => {
      // 20260522000013 calls reapply_owner_rls which uses the T45-tightened macro,
      // so the owner-manage policy requires is_member(asociatie_id) as well.
      expect(flat).toContain("reapply_owner_rls('anonymous_messages', 'sender_user_id')");
    });

    it('anonymous_messages_for_comitet SECURITY DEFINER function gates on has_role and scopes by asociatie_id', () => {
      expect(flat).toContain('create or replace function anonymous_messages_for_comitet');
      expect(flat).toContain('security definer');
      // Must filter rows by the caller-supplied asociatie_id parameter.
      expect(flat).toContain('m.asociatie_id = p_asociatie_id');
      // Must verify the caller holds a privileged role in that specific asociatie.
      expect(flat).toContain("has_role(p_asociatie_id, array['admin','presedinte','comitet'])");
    });

    it('vote and signature junction tables have no UPDATE, DELETE, or ALL policy (immutable post-cast)', () => {
      // T34 / T69: these tables grant SELECT + INSERT only.  apply_standard_rls is
      // deliberately NOT called on them because it would add a "comitet write" (for all)
      // grant that would allow post-vote mutation.
      const junctionTables = ['idea_votes', 'petition_signatures', 'budget_votes'] as const;
      for (const tbl of junctionTables) {
        expect(
          standardRlsTables.has(tbl),
          `apply_standard_rls must NOT be called on ${tbl} (it would grant update/delete)`,
        ).toBe(false);
        expect(
          flat,
          `${tbl} must not have any UPDATE, DELETE, or ALL policy`,
        ).not.toMatch(
          new RegExp(`create policy[^;]+on ${tbl} for (?:update|delete|all)\\b`),
        );
      }
    });

    it('apply_governance_owner_rls was applied to budget_proposals, ideas, and petitions', () => {
      for (const tbl of ['budget_proposals', 'ideas', 'petitions'] as const) {
        expect(
          flat,
          `apply_governance_owner_rls must be called for ${tbl}`,
        ).toContain(`apply_governance_owner_rls('${tbl}'`);
      }
    });

    it('governance owner insert/update/delete policies all require is_member(asociatie_id)', () => {
      // The macro-body assertion in Group A verifies the implementation; this test
      // confirms the macro was actually wired to all three governance tables.
      expect(flat).toContain("apply_governance_owner_rls('budget_proposals'");
      expect(flat).toContain("apply_governance_owner_rls('ideas'");
      expect(flat).toContain("apply_governance_owner_rls('petitions'");
    });
  });
});
