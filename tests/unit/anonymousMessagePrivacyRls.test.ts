import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// Regression guard for T137: anonymous_messages (F05) once carried the standard
// "members read" / "comitet write" RLS (apply_standard_rls), so any member of the
// asociatie — and the comitet via the for-all grant — could SELECT every row
// including sender_user_id, defeating the feature's anonymity (the sender is
// real PII: the GDPR export keys off it). 20260526000001_anonymous_message_privacy.sql
// drops those blanket policies, keeps only the self-scoped "owner manage" so the
// sender manages/exports their own rows, and exposes the comitet inbox + status
// triage through SECURITY DEFINER functions that never project the sender. This
// backend-free test asserts that shape holds so the within-tenant leak cannot
// silently return. Mirrors responsePrivacyRls.test.ts (T38).

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

describe('anonymous-message privacy RLS (T137)', () => {
  const raw = allMigrationSql();
  const sql = flatten(raw);

  it('drops the blanket "members read" and "comitet write" policies', () => {
    expect(sql).toContain('drop policy if exists "members read" on anonymous_messages');
    expect(sql).toContain('drop policy if exists "comitet write" on anonymous_messages');
  });

  it('introduces no member/comitet read or for-all policy on the table', () => {
    // Only the self-scoped "owner manage" policy (reapply_owner_rls) may remain.
    // No new SELECT/UPDATE/DELETE/for-all policy may expose rows to the comitet
    // or other members directly — they must go through the definer functions.
    expect(sql).not.toMatch(/create policy "members read" on anonymous_messages/);
    expect(sql).not.toMatch(/create policy "[^"]*" on anonymous_messages for select/);
    expect(sql).not.toMatch(/create policy "[^"]*" on anonymous_messages for update/);
    expect(sql).not.toMatch(/create policy "[^"]*" on anonymous_messages for delete/);
    // The only "for all" allowed is the owner-scoped one whose name is "owner manage".
    const forAll = [...sql.matchAll(/create policy "([^"]*)" on anonymous_messages for all/g)];
    for (const m of forAll) {
      expect(m[1]).toBe('owner manage');
    }
  });

  it('keeps the sender self-scoped owner policy (submit / withdraw / export)', () => {
    // reapply_owner_rls(...,'sender_user_id') is the kept access path.
    expect(sql).toContain("reapply_owner_rls('anonymous_messages', 'sender_user_id')");
  });

  describe('comitet inbox read function', () => {
    it('is security definer with a fixed search_path', () => {
      const def = sql.match(
        /create or replace function anonymous_messages_for_comitet\(([^)]*)\)(.*?)\$\$/s,
      );
      expect(def, 'anonymous_messages_for_comitet must be defined').not.toBeNull();
      expect(def![2]).toContain('security definer set search_path = public');
    });

    it('never projects sender_user_id in its returns signature', () => {
      const returns = raw.match(
        /create or replace function anonymous_messages_for_comitet\([^)]*\)\s*returns ([^\n]*)/i,
      );
      expect(returns, 'returns clause must exist').not.toBeNull();
      expect(returns![1].toLowerCase()).not.toContain('sender_user_id');
    });

    it('gates on the privileged role for the target asociatie', () => {
      expect(sql).toMatch(
        /function anonymous_messages_for_comitet.*?has_role\(p_asociatie_id, array\['admin','presedinte','comitet'\]\)/s,
      );
    });
  });

  describe('comitet status triage function', () => {
    it('is security definer with a fixed search_path', () => {
      const def = sql.match(
        /create or replace function set_anonymous_message_status\(([^)]*)\)(.*?)\$\$/s,
      );
      expect(def, 'set_anonymous_message_status must be defined').not.toBeNull();
      expect(def![2]).toContain('security definer set search_path = public');
    });

    it('gates on the privileged role and validates the status value', () => {
      const body = sql.match(
        /function set_anonymous_message_status.*?\$\$(.*?)\$\$/s,
      );
      expect(body, 'function body must exist').not.toBeNull();
      expect(body![1]).toContain("has_role(v_asociatie_id, array['admin','presedinte','comitet'])");
      expect(body![1]).toContain("p_status not in ('nou', 'rezolvat')");
      // It must only ever update the status column, never body or identity.
      expect(body![1]).toContain('update anonymous_messages set status = p_status');
      expect(body![1]).not.toContain('sender_user_id =');
    });
  });
});
