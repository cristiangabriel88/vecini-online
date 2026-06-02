#!/usr/bin/env node
// vecini.online — Pi DEV seed: one Supabase auth user per role with a known dev password.
//
// Usage:
//   node scripts/pi-seed.mjs
//   node scripts/pi-seed.mjs --password mySecret
//
// Reads VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from the environment or
// from .env in the project root (dotenv-lite built-in — no extra deps needed).
//
// Guards (both must pass):
//   - VITE_APP_STAGE must equal "dev"
//   - VITE_SUPABASE_URL must NOT match *.supabase.co (refuse to seed cloud DB)
//
// Role / email / password map (printed on success for copy-paste into the app):
//   admin        admin@dev.local        <password>
//   presedinte   presedinte@dev.local   <password>
//   comitet      comitet@dev.local      <password>
//   cenzor       cenzor@dev.local       <password>
//   proprietar   proprietar@dev.local   <password>
//   locatar      locatar@dev.local      <password>
//   super_admin  super.admin@dev.local  <password>  (+platform_admins grant)
//
// All six tenant roles get a membership in the seeded asociatie
// (id 00000000-0000-0000-0000-0000000000a1, from supabase/seed.sql).
// super_admin gets a platform_admins row instead of a membership.
//
// Idempotent: if an auth user with that email already exists the script skips
// creation and (re-)applies the membership / platform grant if missing.

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

// ── Paths ─────────────────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');

// ── Lite env loader (reads .env from project root, does not override set vars) ─

function loadEnvFile() {
  try {
    const raw = readFileSync(resolve(ROOT, '.env'), 'utf8');
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx < 1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      // Strip surrounding quotes if present
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
  } catch {
    // .env absent -- rely on already-set environment variables
  }
}

loadEnvFile();

// ── CLI args ──────────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  let password = process.env.VITE_DEV_PASSWORD ?? 'dev-password';
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--password' && args[i + 1]) {
      password = args[i + 1];
      i++;
    }
  }
  return { password };
}

const { password } = parseArgs();

// ── Guards ────────────────────────────────────────────────────────────────────

const stage = process.env.VITE_APP_STAGE ?? '';
if (stage !== 'dev') {
  console.error(`ERROR: VITE_APP_STAGE="${stage}" -- this script only runs when VITE_APP_STAGE=dev.`);
  console.error('Refusing to seed a non-DEV environment.');
  process.exit(1);
}

const supabaseUrl = process.env.VITE_SUPABASE_URL ?? '';
if (!supabaseUrl) {
  console.error('ERROR: VITE_SUPABASE_URL is not set. Edit .env and set it to your local Supabase URL.');
  process.exit(1);
}
if (/\.supabase\.co(:|\/|$)/.test(supabaseUrl)) {
  console.error(`ERROR: VITE_SUPABASE_URL="${supabaseUrl}" looks like a Supabase cloud URL.`);
  console.error('Refusing to seed a cloud database. Point VITE_SUPABASE_URL at your local stack.');
  process.exit(1);
}

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
if (!serviceRoleKey || serviceRoleKey === 'REDACTED_LOCAL_SERVICE_ROLE_KEY') {
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY is not set or is still the placeholder value.');
  console.error('Run `supabase start` and paste the service_role key into .env.');
  process.exit(1);
}

// ── Supabase admin client (bypasses RLS, same pattern as supabaseAdmin.ts) ───

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ── Role / user definitions ───────────────────────────────────────────────────

const ASOCIATIE_ID = '00000000-0000-0000-0000-0000000000a1';

const USERS = [
  { role: 'admin',       email: 'admin@dev.local',       displayName: 'Admin Dev',       membershipRole: 'admin' },
  { role: 'presedinte',  email: 'presedinte@dev.local',  displayName: 'Președinte Dev',   membershipRole: 'presedinte' },
  { role: 'comitet',     email: 'comitet@dev.local',      displayName: 'Comitet Dev',      membershipRole: 'comitet' },
  { role: 'cenzor',      email: 'cenzor@dev.local',       displayName: 'Cenzor Dev',       membershipRole: 'cenzor' },
  { role: 'proprietar',  email: 'proprietar@dev.local',   displayName: 'Proprietar Dev',   membershipRole: 'proprietar' },
  { role: 'locatar',     email: 'locatar@dev.local',      displayName: 'Locatar Dev',      membershipRole: 'locatar' },
  { role: 'super_admin', email: 'super.admin@dev.local',  displayName: 'Super Admin Dev',  membershipRole: null },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

async function findExistingUser(email) {
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  return (data?.users ?? []).find((u) => u.email === email) ?? null;
}

async function upsertUser(def) {
  const { email, displayName, role, membershipRole } = def;
  let userId;

  // 1. Create or locate auth user
  const existing = await findExistingUser(email);
  if (existing) {
    userId = existing.id;
    console.log(`  [skip]   ${email} (auth user already exists, id=${userId.slice(0, 8)}...)`);
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: displayName },
    });
    if (error || !data.user) {
      console.error(`  [ERROR]  ${email}: ${error?.message ?? 'createUser returned no user'}`);
      return;
    }
    userId = data.user.id;
    console.log(`  [create] ${email} (id=${userId.slice(0, 8)}...)`);
  }

  // 2. Upsert public.users row (mirrors auth.users)
  const { error: userErr } = await admin
    .from('users')
    .upsert({ id: userId, email, full_name: displayName }, { onConflict: 'id' });
  if (userErr) {
    console.error(`  [ERROR]  users row for ${email}: ${userErr.message}`);
    return;
  }

  // 3a. Tenant membership (all roles except super_admin)
  if (membershipRole) {
    const { error: memErr } = await admin
      .from('memberships')
      .upsert(
        { user_id: userId, asociatie_id: ASOCIATIE_ID, role: membershipRole },
        { onConflict: 'user_id,asociatie_id,role' },
      );
    if (memErr) {
      console.error(`  [ERROR]  membership for ${email} (${membershipRole}): ${memErr.message}`);
      return;
    }
    console.log(`  [grant]  membership ${membershipRole} in asociatie ${ASOCIATIE_ID.slice(0, 8)}...`);
  }

  // 3b. Platform super_admin grant
  if (role === 'super_admin') {
    const { error: paErr } = await admin
      .from('platform_admins')
      .upsert({ user_id: userId, note: 'seeded by pi-seed.mjs' }, { onConflict: 'user_id' });
    if (paErr) {
      console.error(`  [ERROR]  platform_admins for ${email}: ${paErr.message}`);
      return;
    }
    console.log(`  [grant]  platform_admins (super_admin)`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

console.log('vecini.online Pi DEV seed');
console.log(`  Supabase URL : ${supabaseUrl}`);
console.log(`  Stage        : ${stage}`);
console.log(`  Asociatie ID : ${ASOCIATIE_ID}`);
console.log(`  Password     : ${'*'.repeat(password.length)}`);
console.log('');

for (const def of USERS) {
  console.log(`-> ${def.role} (${def.email})`);
  await upsertUser(def);
  console.log('');
}

console.log('Done. Role / email / password map:');
console.log('');
console.log('  Role          Email                    Password');
console.log('  ------------- ------------------------ --------');
for (const def of USERS) {
  const padRole  = def.role.padEnd(13);
  const padEmail = def.email.padEnd(24);
  console.log(`  ${padRole} ${padEmail} ${password}`);
}
console.log('');
console.log('Use these credentials with `npm run dev:pi` or the floating role switcher.');
