import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// Migration guard for T80. The T38 aggregates (survey_tally / poll_tally /
// priority_ranking_turnout) let a member see results without reading another
// member's row, but they were never granted EXECUTE to `authenticated`, so the
// live read path could not call them; and ranked polls had no attribution-free
// aggregate at all. 20260602000004_tally_grants_ranked.sql adds the grants and a
// poll_ranked_tally over the ranked_options jsonb. This backend-free test reads
// the migration SQL and asserts the grants and the ranked function's
// least-privilege shape hold, so neither regresses.

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

describe('tally function grants + ranked aggregate (T80)', () => {
  const raw = allMigrationSql();
  const sql = flatten(raw);

  const granted = ['survey_tally', 'poll_tally', 'priority_ranking_turnout', 'poll_ranked_tally'] as const;

  for (const fn of granted) {
    it(`${fn} grants execute to authenticated`, () => {
      expect(sql).toContain(`grant execute on function ${fn}(uuid) to authenticated`);
    });
  }

  it('poll_ranked_tally is security definer with a fixed search_path', () => {
    const def = sql.match(
      /create or replace function poll_ranked_tally\(([^)]*)\)(.*?)\$\$/s,
    );
    expect(def, 'poll_ranked_tally must be defined').not.toBeNull();
    expect(def![2]).toContain('security definer set search_path = public');
  });

  it('poll_ranked_tally aggregates the ranked_options jsonb and gates on is_member', () => {
    const body = sql.match(/function poll_ranked_tally.*?\$\$(.*?)\$\$/s);
    expect(body, 'poll_ranked_tally body must exist').not.toBeNull();
    const inner = body![1];
    expect(inner).toContain('jsonb_each_text');
    expect(inner).toContain('v.ranked_options');
    expect(inner).toContain('is_member(p.asociatie_id)');
  });

  it('poll_ranked_tally never projects a voter identity column', () => {
    const returns = raw.match(
      /create or replace function poll_ranked_tally\([^)]*\)\s*returns ([^\n]*)/i,
    );
    expect(returns, 'poll_ranked_tally returns clause').not.toBeNull();
    const sig = returns![1].toLowerCase();
    expect(sig).not.toContain('user_id');
    expect(sig).not.toContain('voter_user_id');
    expect(sig).not.toContain('apartment_id');
  });
});
