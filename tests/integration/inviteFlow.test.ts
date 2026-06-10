/**
 * T300 -- Live round-trip integration test for the invite flow.
 *
 * Tests that the writer/reader contract between the provisioning functions
 * (which store SHA-256 token hashes) and the onboarding RPCs (which hash the
 * plaintext token before lookup) is correct end-to-end against a real DB.
 *
 * Prerequisites:
 *   VITE_SUPABASE_URL         -- Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY -- Service-role key (bypasses RLS for setup/teardown)
 *   VITE_SUPABASE_ANON_KEY    -- Anon/public key (used for resolve + user sign-in)
 *
 * Run: npm run test:integration
 * All tests are skipped when credentials are absent so the unit suite stays
 * offline-safe and CI without a live Supabase remains green.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createHash, randomBytes } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// ── Environment ───────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY ?? '';

const isLive = Boolean(SUPABASE_URL && SERVICE_ROLE_KEY && ANON_KEY);

// ── Helpers matching provision-asociatie.ts logic ────────────────────────────

function generateToken(): string {
  return randomBytes(32).toString('hex');
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function generateCode(): string {
  return randomBytes(4).toString('hex').toUpperCase();
}

interface InviteOpts {
  asociatieId: string;
  inviteeEmail: string;
  inviteeName: string;
  kind?: string;
  expiresAt?: string | null;
  revokedAt?: string | null;
}

async function insertTestInvite(
  admin: SupabaseClient,
  opts: InviteOpts,
): Promise<{ inviteId: string; plainToken: string }> {
  const plainToken = generateToken();
  const tokenHash = hashToken(plainToken);
  const code = generateCode();

  const expiresAt =
    opts.expiresAt !== undefined
      ? opts.expiresAt
      : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const row: Record<string, unknown> = {
    asociatie_id: opts.asociatieId,
    code,
    token: tokenHash,
    expires_at: expiresAt,
    invitee_name: opts.inviteeName,
    invitee_email: opts.inviteeEmail,
    kind: opts.kind ?? 'admin_setup',
  };
  if (opts.revokedAt) row.revoked_at = opts.revokedAt;

  const { data, error } = await admin
    .from('invite_codes')
    .insert(row)
    .select('id')
    .single();

  if (error || !data) throw new Error(`insertTestInvite failed: ${error?.message}`);
  return { inviteId: (data as { id: string }).id, plainToken };
}

// ── Suite ──────────────────────────────────────────────────────────────────────

describe.skipIf(!isLive)('invite flow: round-trip integration (T300)', () => {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const anon = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let testAsociatieId = '';
  const testUserIds: string[] = [];

  async function createTestUser(email: string, password: string): Promise<string> {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error || !data.user) throw new Error(`createTestUser failed: ${error?.message}`);
    testUserIds.push(data.user.id);
    return data.user.id;
  }

  async function signInUser(email: string, password: string): Promise<SupabaseClient> {
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await userClient.auth.signInWithPassword({ email, password });
    if (error) throw new Error(`signInUser failed: ${error.message}`);
    return userClient;
  }

  beforeAll(async () => {
    const slug = `test-asoc-${randomBytes(6).toString('hex')}`;
    const { data, error } = await admin
      .from('asociatii')
      .insert({ name: 'Integration Test Asoc', slug, address: '(test)' })
      .select('id')
      .single();
    if (error || !data) throw new Error(`beforeAll: failed to create asociatie: ${error?.message}`);
    testAsociatieId = (data as { id: string }).id;
  });

  afterAll(async () => {
    // Delete test auth users first; cascade removes public.users rows.
    for (const uid of testUserIds) {
      await admin.auth.admin.deleteUser(uid);
    }
    // Delete the test asociatie; cascade removes invite_codes, memberships, audit_log.
    if (testAsociatieId) {
      await admin.from('asociatii').delete().eq('id', testAsociatieId);
    }
  });

  // ── 1. resolve returns ok and exposes correct context ──────────────────────

  it('resolve_onboarding_token returns ok with correct kind and email for a valid invite', async () => {
    const email = `resolve-${randomBytes(4).toString('hex')}@test.example`;
    const { plainToken } = await insertTestInvite(admin, {
      asociatieId: testAsociatieId,
      inviteeEmail: email,
      inviteeName: 'Resolve Test',
    });

    const { data, error } = await anon.rpc('resolve_onboarding_token', {
      p_token: plainToken,
    });

    expect(error).toBeNull();
    const result = data as Record<string, unknown>;
    expect(result.status).toBe('ok');
    expect(result.kind).toBe('admin_setup');
    expect(result.invitee_email).toBe(email);
    expect(result.invitee_name).toBe('Resolve Test');
  });

  // ── 2. Full round-trip: provision -> resolve -> redeem -> membership ────────

  it('full round-trip: redeem succeeds and creates admin membership', async () => {
    const suffix = randomBytes(4).toString('hex');
    const email = `redeem-${suffix}@test.example`;
    const password = `Test1234!${suffix}`;

    const { plainToken, inviteId } = await insertTestInvite(admin, {
      asociatieId: testAsociatieId,
      inviteeEmail: email,
      inviteeName: 'Redeem Test',
    });

    // Resolve phase (anon-accessible)
    const { data: resolveData, error: resolveErr } = await anon.rpc(
      'resolve_onboarding_token',
      { p_token: plainToken },
    );
    expect(resolveErr).toBeNull();
    expect((resolveData as Record<string, unknown>).status).toBe('ok');

    // Create user and sign in
    await createTestUser(email, password);
    const userClient = await signInUser(email, password);

    // Redeem phase (authenticated)
    const { data: redeemData, error: redeemErr } = await userClient.rpc(
      'redeem_onboarding_token',
      { p_token: plainToken, p_full_name: 'Redeem Test', p_locale: 'ro' },
    );
    expect(redeemErr).toBeNull();
    const redeem = redeemData as Record<string, unknown>;
    expect(redeem.status).toBe('ok');
    expect(redeem.role).toBe('admin');
    expect(redeem.kind).toBe('admin_setup');
    expect(redeem.asociatie_id).toBe(testAsociatieId);

    // Verify membership row was created
    const { data: membership } = await admin
      .from('memberships')
      .select('role')
      .eq('asociatie_id', testAsociatieId)
      .eq('role', 'admin')
      .maybeSingle();
    expect(membership).not.toBeNull();
    expect((membership as Record<string, unknown>).role).toBe('admin');

    // Verify invite is marked consumed
    const { data: invite } = await admin
      .from('invite_codes')
      .select('consumed_at')
      .eq('id', inviteId)
      .single();
    expect((invite as Record<string, unknown>).consumed_at).not.toBeNull();
  });

  // ── 3. Single-use: second redeem returns 'used' ────────────────────────────

  it('single-use: second redeem of a consumed invite returns used', async () => {
    const suffix = randomBytes(4).toString('hex');
    const email = `single-${suffix}@test.example`;
    const password = `Test1234!${suffix}`;

    const { plainToken } = await insertTestInvite(admin, {
      asociatieId: testAsociatieId,
      inviteeEmail: email,
      inviteeName: 'Single Use Test',
    });

    await createTestUser(email, password);
    const userClient = await signInUser(email, password);

    // First redeem succeeds
    const { data: first } = await userClient.rpc('redeem_onboarding_token', {
      p_token: plainToken,
      p_full_name: 'Single Use Test',
      p_locale: 'ro',
    });
    expect((first as Record<string, unknown>).status).toBe('ok');

    // Second redeem is rejected because single_use defaults to true
    const { data: second } = await userClient.rpc('redeem_onboarding_token', {
      p_token: plainToken,
      p_full_name: 'Single Use Test',
      p_locale: 'ro',
    });
    expect((second as Record<string, unknown>).status).toBe('used');
  });

  // ── 4. Expiry: resolve and redeem both return 'expired' ────────────────────

  it('expired invite: resolve returns expired', async () => {
    const email = `expired-${randomBytes(4).toString('hex')}@test.example`;
    const pastDate = new Date(Date.now() - 60_000).toISOString();

    const { plainToken } = await insertTestInvite(admin, {
      asociatieId: testAsociatieId,
      inviteeEmail: email,
      inviteeName: 'Expired Test',
      expiresAt: pastDate,
    });

    const { data, error } = await anon.rpc('resolve_onboarding_token', {
      p_token: plainToken,
    });
    expect(error).toBeNull();
    expect((data as Record<string, unknown>).status).toBe('expired');
  });

  it('expired invite: redeem returns expired', async () => {
    const suffix = randomBytes(4).toString('hex');
    const email = `expired-redeem-${suffix}@test.example`;
    const password = `Test1234!${suffix}`;
    const pastDate = new Date(Date.now() - 60_000).toISOString();

    const { plainToken } = await insertTestInvite(admin, {
      asociatieId: testAsociatieId,
      inviteeEmail: email,
      inviteeName: 'Expired Redeem Test',
      expiresAt: pastDate,
    });

    await createTestUser(email, password);
    const userClient = await signInUser(email, password);

    const { data } = await userClient.rpc('redeem_onboarding_token', {
      p_token: plainToken,
      p_full_name: 'Expired Redeem Test',
      p_locale: 'ro',
    });
    expect((data as Record<string, unknown>).status).toBe('expired');
  });

  // ── 5. Email mismatch: redeem with wrong user returns 'email_mismatch' ──────

  it('email mismatch: user with different email gets email_mismatch', async () => {
    const suffix = randomBytes(4).toString('hex');
    const intendedEmail = `intended-${suffix}@test.example`;
    const otherEmail = `other-${suffix}@test.example`;
    const password = `Test1234!${suffix}`;

    const { plainToken } = await insertTestInvite(admin, {
      asociatieId: testAsociatieId,
      inviteeEmail: intendedEmail,
      inviteeName: 'Intended Admin',
    });

    // Create a user with a DIFFERENT email than the invite's invitee_email
    await createTestUser(otherEmail, password);
    const userClient = await signInUser(otherEmail, password);

    const { data } = await userClient.rpc('redeem_onboarding_token', {
      p_token: plainToken,
      p_full_name: 'Wrong User',
      p_locale: 'ro',
    });
    expect((data as Record<string, unknown>).status).toBe('email_mismatch');
  });
});
