import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// Regression guard for T129: private_threads / private_messages once had the
// standard "members read" / "comitet write" blanket RLS (apply_standard_rls),
// allowing any member of the asociatie to SELECT every row — including threads
// belonging to other residents. Migration 20260525000002_private_threads_inbox.sql
// replaced those with party-or-admin policies: a resident can only access
// threads where they are the resident_user_id; admins and presedinti see all
// threads in their asociatie. This backend-free test asserts that shape holds
// so the within-tenant privacy leak cannot silently return. Mirrors
// anonymousMessagePrivacyRls.test.ts (T137).

const migrationsDir = join(process.cwd(), 'supabase', 'migrations');

function allMigrationSql(): string {
  return readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => readFileSync(join(migrationsDir, f), 'utf8'))
    .join('\n');
}

function flatten(sql: string): string {
  return sql.toLowerCase().replace(/\s+/g, ' ');
}

describe('private-thread party-or-admin RLS (T129)', () => {
  const raw = allMigrationSql();
  const sql = flatten(raw);

  it('drops the blanket "members read" and "comitet write" policies on private_threads', () => {
    expect(sql).toContain('drop policy if exists "members read" on private_threads');
    expect(sql).toContain('drop policy if exists "comitet write" on private_threads');
  });

  it('drops the blanket policies on private_messages', () => {
    expect(sql).toContain('drop policy if exists "members read" on private_messages');
    expect(sql).toContain('drop policy if exists "comitet write" on private_messages');
  });

  it('introduces a thread read policy scoped to the resident party or admin/presedinte', () => {
    expect(sql).toContain('create policy "thread party read" on private_threads for select');
    expect(sql).toContain('resident_user_id = auth.uid()');
    expect(sql).toMatch(/has_role\(asociatie_id, array\['admin', 'presedinte'\]\)/);
  });

  it('introduces a thread write policy with the same party-or-admin scope', () => {
    expect(sql).toContain('create policy "thread party write" on private_threads for all');
    expect(sql).toContain('is_member(asociatie_id)');
  });

  it('message read policy gates on the parent thread party check', () => {
    expect(sql).toContain('create policy "message party read" on private_messages for select');
    // The subquery must join back to private_threads and apply the same rule.
    expect(sql).toContain('select 1 from private_threads t where t.id = private_messages.thread_id');
  });

  it('message write policy also gates on the parent thread', () => {
    expect(sql).toContain('create policy "message party write" on private_messages for all');
    expect(sql).toContain('is_member(asociatie_id)');
  });

  it('no blanket member/comitet SELECT policy was reintroduced on either table', () => {
    // Any SELECT policy on these tables must be the party-scoped ones we added.
    const threadSelectPolicies = [
      ...sql.matchAll(/create policy "([^"]*)" on private_threads for select/g),
    ];
    for (const m of threadSelectPolicies) {
      expect(m[1]).toBe('thread party read');
    }
    const messageSelectPolicies = [
      ...sql.matchAll(/create policy "([^"]*)" on private_messages for select/g),
    ];
    for (const m of messageSelectPolicies) {
      expect(m[1]).toBe('message party read');
    }
  });
});
