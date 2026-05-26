import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// RLS shape guard for T150: feature_requests is the channel a resident uses to
// ask the admin to enable a module. A resident may read and file (and withdraw)
// only their own request, scoped to an asociație they belong to; admin/president
// may read the asociație queue and clear actioned rows. No one may edit content,
// and a unique constraint keeps one open request per resident + module so the
// queue cannot be flooded. This backend-free test asserts that shape holds so the
// scoping cannot silently regress. Mirrors anonymousMessagePrivacyRls.test.ts.

const migrationsDir = join(process.cwd(), 'supabase', 'migrations');

function migrationSql(): string {
  const file = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('_feature_requests.sql'))
    .sort()
    .at(-1);
  expect(file, 'feature_requests migration must exist').toBeTruthy();
  return readFileSync(join(migrationsDir, file as string), 'utf8');
}

function flatten(sql: string): string {
  return sql.toLowerCase().replace(/\s+/g, ' ');
}

describe('feature_requests RLS (T150)', () => {
  const raw = migrationSql();
  const sql = flatten(raw);

  it('enables row level security and scopes the row to a tenant', () => {
    expect(sql).toContain('alter table feature_requests enable row level security');
    expect(sql).toContain('asociatie_id uuid not null references asociatii(id) on delete cascade');
  });

  it('enforces one open request per resident + module via a unique constraint', () => {
    expect(sql).toContain('unique (asociatie_id, feature_key, requested_by)');
  });

  it('lets a resident file only their own request inside a tenant they belong to', () => {
    expect(sql).toMatch(
      /create policy "self file own feature request" on feature_requests for insert with check \(requested_by = auth\.uid\(\) and is_member\(asociatie_id\)\)/,
    );
  });

  it('lets a resident read and withdraw only their own request', () => {
    expect(sql).toMatch(
      /create policy "self read own feature request" on feature_requests for select using \(requested_by = auth\.uid\(\)\)/,
    );
    expect(sql).toMatch(
      /create policy "self withdraw own feature request" on feature_requests for delete using \(requested_by = auth\.uid\(\)\)/,
    );
  });

  it('lets only admin/president read and clear the asociație queue', () => {
    expect(sql).toMatch(
      /create policy "admin read asociatie feature requests" on feature_requests for select using \(has_role\(asociatie_id, array\['admin', 'presedinte'\]\)\)/,
    );
    expect(sql).toMatch(
      /create policy "admin clear asociatie feature requests" on feature_requests for delete using \(has_role\(asociatie_id, array\['admin', 'presedinte'\]\)\)/,
    );
  });

  it('exposes no update policy, so request content can never be edited', () => {
    expect(sql).not.toMatch(/create policy "[^"]*" on feature_requests for update/);
  });
});
