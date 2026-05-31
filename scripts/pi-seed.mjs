#!/usr/bin/env node
// scripts/pi-seed.mjs -- Seed one Supabase auth user per role for local Pi DEV.
//
// Creates (or updates) 7 users sharing a fixed dev password, inserts matching
// memberships rows for the 6 tenant roles, and grants super_admin status via
// platform_admins for super.admin@dev.local.
//
// SAFETY GUARDS:
//   - Refuses to run unless VITE_APP_STAGE=dev.
//   - Refuses to run against a cloud Supabase URL (*.supabase.co).
//   - Requires SUPABASE_SERVICE_ROLE_KEY to be set and non-placeholder.
//
// Usage:
//   node scripts/pi-seed.mjs
//   node scripts/pi-seed.mjs --password MySecret1!
//   npm run pi:seed
//   bash scripts/pi.sh seed

import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// ── Env: load .env from repo root if present ─────────────────────────────────
function loadDotEnv(filePath) {
  if (!existsSync(filePath)) return;
  for (const raw of readFileSync(filePath, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    // Strip surrounding quotes if present.
    if ((val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

loadDotEnv(resolve(ROOT, '.env'));

// ── Safety guards ─────────────────────────────────────────────────────────────
const stage = process.env.VITE_APP_STAGE ?? '';
if (stage !== 'dev') {
  console.error(
    `\nERROR: pi:seed is only safe in the DEV stage.\n` +
    `  VITE_APP_STAGE="${stage}" (expected "dev").\n` +
    `  Set VITE_APP_STAGE=dev in .env before running.\n`,
  );
  process.exit(1);
}

const supabaseUrl = (process.env.VITE_SUPABASE_URL ?? '').replace(/\/+$/, '');
if (!supabaseUrl || /\.supabase\.co($|\/)/i.test(supabaseUrl)) {
  console.error(
    `\nERROR: pi:seed refused to run against a cloud Supabase URL.\n` +
    `  VITE_SUPABASE_URL="${supabaseUrl}"\n` +
    `  Only local Pi Supabase stacks are allowed.\n`,
  );
  process.exit(1);
}

const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
if (!serviceKey || serviceKey.toUpperCase().startsWith('REDACTED')) {
  console.error(
    `\nERROR: SUPABASE_SERVICE_ROLE_KEY is not set or is still a placeholder.\n` +
    `  Paste the local service-role key from "supabase start" into .env.\n`,
  );
  process.exit(1);
}

// ── Args ─────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const pwIdx = args.indexOf('--password');
const DEV_PASSWORD = (pwIdx >= 0 && args[pwIdx + 1]) ? args[pwIdx + 1] : 'DevLocal1!';

// ── Constants ─────────────────────────────────────────────────────────────────
// Matches supabase/seed.sql -- this is the seeded demo asociatie.
const SEED_ASOCIATIE_ID = '00000000-0000-0000-0000-0000000000a1';

/** The 6 tenant roles that get memberships in the seed asociatie. */
const TENANT_USERS = [
  { email: 'admin@dev.local',      role: 'admin' },
  { email: 'presedinte@dev.local', role: 'presedinte' },
  { email: 'comitet@dev.local',    role: 'comitet' },
  { email: 'cenzor@dev.local',     role: 'cenzor' },
  { email: 'proprietar@dev.local', role: 'proprietar' },
  { email: 'chirias@dev.local',    role: 'chirias' },
];

const SUPER_ADMIN_EMAIL = 'super.admin@dev.local';

// ── Service-role client ───────────────────────────────────────────────────────
const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Create or update an auth user. Returns the auth User object.
 * Idempotent: if the email already exists the password is updated.
 */
async function upsertAuthUser(email) {
  // Load all users (small dev seed -- pagination not a concern).
  const { data: list, error: listErr } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (listErr) throw new Error(`listUsers: ${listErr.message}`);

  const existing = list?.users?.find((u) => u.email === email);
  if (existing) {
    const { data, error } = await supabase.auth.admin.updateUserById(existing.id, {
      password: DEV_PASSWORD,
      email_confirm: true,
    });
    if (error) throw new Error(`updateUser ${email}: ${error.message}`);
    return data.user;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: DEV_PASSWORD,
    email_confirm: true,
  });
  if (error) throw new Error(`createUser ${email}: ${error.message}`);
  return data.user;
}

/** Insert or update the public.users profile row (bypasses RLS via service role). */
async function upsertProfile(userId, email) {
  const { error } = await supabase
    .from('users')
    .upsert({ id: userId, email, locale: 'ro' }, { onConflict: 'id' });
  if (error) throw new Error(`upsertProfile ${email}: ${error.message}`);
}

/** Insert or update a memberships row for the given tenant role. */
async function upsertMembership(userId, role) {
  const { error } = await supabase
    .from('memberships')
    .upsert(
      { user_id: userId, asociatie_id: SEED_ASOCIATIE_ID, role },
      { onConflict: 'user_id,asociatie_id,role' },
    );
  if (error) throw new Error(`upsertMembership ${role}: ${error.message}`);
}

/** Insert or update a platform_admins row. granted_by is set to the same user (self-grant for dev). */
async function upsertPlatformAdmin(userId) {
  const { error } = await supabase
    .from('platform_admins')
    .upsert(
      { user_id: userId, granted_by: userId, note: 'pi:seed dev bootstrap' },
      { onConflict: 'user_id' },
    );
  if (error) throw new Error(`upsertPlatformAdmin: ${error.message}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
console.log('\nvecini.online pi:seed');
console.log(`  Supabase: ${supabaseUrl}`);
console.log(`  Stage:    ${stage}`);
console.log(`  Asociatie: ${SEED_ASOCIATIE_ID}`);
console.log(`  Password:  ${DEV_PASSWORD}\n`);

let failed = 0;

for (const { email, role } of TENANT_USERS) {
  const label = `  ${email.padEnd(32)} [${role}]`;
  process.stdout.write(`${label}  `);
  try {
    const user = await upsertAuthUser(email);
    await upsertProfile(user.id, email);
    await upsertMembership(user.id, role);
    console.log('ok');
  } catch (err) {
    console.log(`FAILED -- ${err.message}`);
    failed++;
  }
}

{
  const label = `  ${SUPER_ADMIN_EMAIL.padEnd(32)} [super_admin]`;
  process.stdout.write(`${label}  `);
  try {
    const user = await upsertAuthUser(SUPER_ADMIN_EMAIL);
    await upsertProfile(user.id, SUPER_ADMIN_EMAIL);
    await upsertPlatformAdmin(user.id);
    console.log('ok');
  } catch (err) {
    console.log(`FAILED -- ${err.message}`);
    failed++;
  }
}

if (failed > 0) {
  console.log(`\n${failed} user(s) failed. Check errors above and retry.\n`);
  process.exit(1);
} else {
  console.log(`\nAll 7 dev users seeded successfully.\n`);
}
