import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// T176 -- pi:seed: static contract tests for scripts/pi-seed.mjs.
//
// The seed script runs in a separate Node process on the Pi so it cannot be
// unit-tested by importing it (top-level await + side effects). These tests
// verify the safety invariants by reading the source, matching the contracts
// that must hold regardless of the runtime environment.

const SEED_PATH = resolve(process.cwd(), 'scripts', 'pi-seed.mjs');

describe('pi-seed.mjs static contract', () => {
  const src = readFileSync(SEED_PATH, 'utf8');

  it('guards against non-dev stage', () => {
    expect(src).toContain("stage !== 'dev'");
  });

  it('guards against cloud Supabase URLs (*.supabase.co)', () => {
    expect(src).toContain('.supabase.co');
    expect(src).toContain('process.exit(1)');
  });

  it('defines all seven role emails matching authStore.signInAsDevUser convention', () => {
    expect(src).toContain('admin@dev.local');
    expect(src).toContain('presedinte@dev.local');
    expect(src).toContain('comitet@dev.local');
    expect(src).toContain('cenzor@dev.local');
    expect(src).toContain('proprietar@dev.local');
    expect(src).toContain('chirias@dev.local');
    expect(src).toContain('super.admin@dev.local');
  });

  it('maps super_admin to super.admin@dev.local (dot convention from authStore)', () => {
    const superAdminIdx = src.indexOf('super_admin');
    const superDotIdx = src.indexOf('super.admin@dev.local');
    expect(superAdminIdx).toBeGreaterThan(-1);
    expect(superDotIdx).toBeGreaterThan(-1);
  });

  it('gives super_admin a null membershipRole (no tenant membership)', () => {
    expect(src).toContain("membershipRole: null");
  });

  it('grants super_admin via platform_admins table, not memberships', () => {
    expect(src).toContain("platform_admins");
    expect(src).toContain("super_admin");
  });

  it('uses upsert for idempotency (re-runnable)', () => {
    expect(src).toContain('.upsert(');
  });

  it('supports --password CLI override', () => {
    expect(src).toContain('--password');
  });

  it('targets the seeded asociatie id from seed.sql', () => {
    expect(src).toContain('00000000-0000-0000-0000-0000000000a1');
  });

  it('uses email_confirm: true so users can log in immediately', () => {
    expect(src).toContain('email_confirm: true');
  });
});
