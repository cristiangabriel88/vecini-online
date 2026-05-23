import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// Regression guard for T38: survey_responses, votes and priority_rankings once
// used the standard "members read" RLS policy, so any member of the asociație
// could read every individual response/vote/ranking row — who answered an
// "anonymous" survey, how each neighbour voted, what each apartment ranked. The
// 20260522000020_response_privacy.sql migration drops that blanket read (and the
// comitet for-all, which also granted blanket per-row read) and replaces it with
// self-scoped reads plus attribution-free aggregate functions. This backend-free
// test reads the migration SQL and asserts the least-privilege shape holds, so
// the within-tenant leak cannot silently return.

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

describe('response-row privacy RLS (T38)', () => {
  const raw = allMigrationSql();
  const sql = flatten(raw);

  const tables = ['survey_responses', 'votes', 'priority_rankings'] as const;

  for (const table of tables) {
    it(`${table} drops the blanket "members read" and "comitet write" policies`, () => {
      expect(sql).toContain(`drop policy if exists "members read" on ${table}`);
      expect(sql).toContain(`drop policy if exists "comitet write" on ${table}`);
    });
  }

  it('survey_responses lets a respondent read only their own answer', () => {
    expect(sql).toContain(
      'create policy "self read own survey response" on survey_responses for select using ( user_id = auth.uid())',
    );
  });

  it('survey_responses limits comitet per-row read to NON-anonymous surveys', () => {
    const policy = sql.match(
      /create policy "comitet read named survey responses" on survey_responses for select using \((.*?)\);/,
    );
    expect(policy, 'comitet named-survey read policy must exist').not.toBeNull();
    const body = policy![1];
    // Gated on the parent survey being non-anonymous AND a privileged role.
    expect(body).toContain('s.anonymous = false');
    expect(body).toContain("has_role(asociatie_id, array['admin','presedinte','comitet'])");
  });

  it('votes lets a voter read only their own vote and stays immutable', () => {
    expect(sql).toContain(
      'create policy "self read own vote" on votes for select using ( voter_user_id = auth.uid())',
    );
    // No update/delete/for-all policy may be (re)introduced on votes.
    expect(sql).not.toMatch(/create policy "[^"]*" on votes for update/);
    expect(sql).not.toMatch(/create policy "[^"]*" on votes for delete/);
    expect(sql).not.toMatch(/create policy "[^"]*" on votes for all/);
  });

  it('survey_responses stays immutable (no update/delete/for-all policy)', () => {
    expect(sql).not.toMatch(/create policy "[^"]*" on survey_responses for update/);
    expect(sql).not.toMatch(/create policy "[^"]*" on survey_responses for delete/);
    expect(sql).not.toMatch(/create policy "[^"]*" on survey_responses for all/);
  });

  it('priority_rankings is self-scoped through apartment_residents (no comitet read)', () => {
    const policy = sql.match(
      /create policy "self manage priority ranking" on priority_rankings for all using \((.*?)\) with check \((.*?)\);/,
    );
    expect(policy, 'self-manage priority ranking policy must exist').not.toBeNull();
    const [, using, withCheck] = policy!;
    // "Own row" resolves through apartment_residents membership, not is_member-wide.
    expect(using).toContain('apartment_residents ar');
    expect(using).toContain('ar.user_id = auth.uid()');
    expect(withCheck).toContain('is_member(asociatie_id)');
    expect(withCheck).toContain('ar.user_id = auth.uid()');
    // It must not be a comitet/role grant.
    expect(using).not.toContain('has_role');
  });

  describe('attribution-free aggregate functions', () => {
    const fns = ['survey_tally', 'poll_tally', 'priority_ranking_turnout'] as const;

    for (const fn of fns) {
      it(`${fn} is security definer with a fixed search_path`, () => {
        const def = sql.match(
          new RegExp(`create or replace function ${fn}\\(([^)]*)\\)(.*?)\\$\\$`, 's'),
        );
        expect(def, `${fn} must be defined`).not.toBeNull();
        expect(def![2]).toContain('security definer set search_path = public');
      });
    }

    it('the aggregate functions never select a user/voter/apartment identity column', () => {
      // Each function returns counts only; none should project an identity column
      // in its RETURNS signature.
      for (const fn of ['survey_tally', 'poll_tally', 'priority_ranking_turnout']) {
        const returns = raw.match(
          new RegExp(`create or replace function ${fn}\\([^)]*\\)\\s*returns ([^\\n]*)`, 'i'),
        );
        expect(returns, `${fn} returns clause`).not.toBeNull();
        const sig = returns![1].toLowerCase();
        expect(sig).not.toContain('user_id');
        expect(sig).not.toContain('voter_user_id');
      }
    });

    it('each aggregate gates on is_member of the owning asociatie', () => {
      const body = sql;
      expect(body).toMatch(/function survey_tally.*?is_member\(s\.asociatie_id\)/s);
      expect(body).toMatch(/function poll_tally.*?is_member\(p\.asociatie_id\)/s);
      expect(body).toMatch(/function priority_ranking_turnout.*?is_member\(pr\.asociatie_id\)/s);
    });
  });
});
