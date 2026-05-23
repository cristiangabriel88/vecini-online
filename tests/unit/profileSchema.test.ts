import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { CUSTOM_FIELD_TYPES } from '@/features/profile/profileLogic';

// Regression guard for T11 (F66): the live schema for the rich profile must stay
// in parity with the offline `profileLogic` model. This reads the migration SQL
// (backend-free, runs offline in CI) and asserts the standard fields extend
// `users`, the `profile_custom_fields` table is owner-scoped + RLS-enabled, and
// its field_type check admits exactly the typed catalog the editor renders, so
// the app and the database can never silently drift.

const migrationsDir = join(process.cwd(), 'supabase', 'migrations');

function allMigrationSql(): string {
  return readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => readFileSync(join(migrationsDir, f), 'utf8'))
    .join('\n');
}

describe('profile_complete schema parity (T11 / F66)', () => {
  const sql = allMigrationSql().toLowerCase();

  it('extends users with the standard profile columns idempotently', () => {
    for (const col of ['display_name', 'scara', 'etaj', 'car_plate', 'address', 'date_of_birth']) {
      expect(sql, `users.${col}`).toContain(`alter table users add column if not exists ${col}`);
    }
    expect(sql).toContain(
      'alter table users add column if not exists emergency_contact jsonb not null default',
    );
  });

  it('creates profile_custom_fields owned by a user, idempotently', () => {
    expect(sql).toContain('create table if not exists profile_custom_fields');
    expect(sql).toMatch(/user_id uuid not null references users\(id\) on delete cascade/);
  });

  it('enables RLS and confines management to the row owner (no wider grant)', () => {
    expect(sql).toContain('alter table profile_custom_fields enable row level security');
    expect(sql).toContain('drop policy if exists "self manage own custom fields" on profile_custom_fields');
    const match = sql.match(
      /create policy "self manage own custom fields" on profile_custom_fields for all\s+using \(user_id = auth\.uid\(\)\)\s+with check \(user_id = auth\.uid\(\)\)/,
    );
    expect(match, 'owner-only for-all policy with using + with check').not.toBeNull();
  });

  it('constrains field_type to exactly the app catalog (CUSTOM_FIELD_TYPES)', () => {
    const match = sql.match(/field_type text not null check \(field_type in\s*\(([^)]*)\)\)/);
    expect(match).not.toBeNull();
    const constrained = (match![1].match(/'([^']+)'/g) ?? [])
      .map((q) => q.replace(/'/g, ''))
      .sort();
    expect(constrained).toEqual([...CUSTOM_FIELD_TYPES].sort());
  });

  it('constrains visibility to private / neighbours', () => {
    const match = sql.match(/visibility text not null default 'private' check \(visibility in \(([^)]*)\)\)/);
    expect(match).not.toBeNull();
    const constrained = (match![1].match(/'([^']+)'/g) ?? []).map((q) => q.replace(/'/g, '')).sort();
    expect(constrained).toEqual(['neighbours', 'private']);
  });
});
