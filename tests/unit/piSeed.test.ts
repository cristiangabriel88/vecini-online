import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// T176 -- pi:seed static-analysis tests.
//
// The script cannot be unit-tested by running it (it needs a live Supabase),
// so we verify the guard conditions, the role list, and the safety invariants
// are present in the source file.

const SRC = readFileSync(resolve(process.cwd(), 'scripts', 'pi-seed.mjs'), 'utf8');

describe('pi-seed.mjs guards', () => {
  it('refuses to run outside dev stage', () => {
    expect(SRC).toContain("stage !== 'dev'");
  });

  it('refuses to run against cloud Supabase URLs', () => {
    expect(SRC).toContain('.supabase.co');
  });

  it('checks service role key is not a placeholder', () => {
    expect(SRC).toContain('REDACTED');
  });
});

describe('pi-seed.mjs role roster', () => {
  const EXPECTED_EMAILS = [
    'admin@dev.local',
    'presedinte@dev.local',
    'comitet@dev.local',
    'cenzor@dev.local',
    'proprietar@dev.local',
    'chirias@dev.local',
    'super.admin@dev.local',
  ];

  for (const email of EXPECTED_EMAILS) {
    it(`includes ${email}`, () => {
      expect(SRC).toContain(email);
    });
  }
});

describe('pi-seed.mjs super_admin handling', () => {
  it('inserts super_admin into platform_admins, not memberships', () => {
    expect(SRC).toContain('upsertPlatformAdmin');
    // upsertPlatformAdmin should reference platform_admins table
    expect(SRC).toContain("'platform_admins'");
  });

  it('does not create a membership row for super_admin email', () => {
    // The SUPER_ADMIN_EMAIL path calls upsertPlatformAdmin, not upsertMembership.
    const superAdminBlock = SRC.slice(SRC.indexOf('SUPER_ADMIN_EMAIL'));
    // The block handling super.admin@dev.local must call upsertPlatformAdmin.
    expect(superAdminBlock).toContain('upsertPlatformAdmin');
  });

  it('seeds against the correct asociatie UUID from seed.sql', () => {
    expect(SRC).toContain('00000000-0000-0000-0000-0000000000a1');
  });
});

describe('pi-seed.mjs --password arg', () => {
  it('supports --password flag', () => {
    expect(SRC).toContain("'--password'");
  });

  it('falls back to a default password', () => {
    expect(SRC).toContain('DevLocal1!');
  });
});
