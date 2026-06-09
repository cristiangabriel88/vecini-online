import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { validateAdminInvite } from '../../src/platform/platformProvisioningLogic';

// T92 -- Server-side privileged provisioning (Netlify function + live UI wire).
//
// These backend-free tests verify the security and behavioural invariants of
// the `provision-asociatie` function and the updated `PlatformAddAsociatiePage`
// by reading the source and migration files. No live Supabase or Resend
// connection is required: if any invariant is weakened in code, the test fails
// before the change reaches production.
//
// Covered invariants:
//   - Function rejects non-POST requests.
//   - Function requires Supabase admin env (503 when absent).
//   - Function resolves caller via bearer token, never from request body.
//   - Function re-checks platform superadmin status server-side via
//     platform_admins (equivalent to is_super_admin(), which cannot be called
//     via the service role).
//   - Function never accepts a client-supplied userId or role.
//   - Function validates adminName + adminEmail server-side.
//   - Invite is created with kind='admin_setup' and a 24h TTL.
//   - Token is generated server-side, never accepted from the client.
//   - Email dispatch is gated on isResendConfigured and is non-fatal.
//   - No PII is logged (no console.log / console.error calls in the function).
//   - UI live branch calls the provisioning endpoint with a bearer token.
//   - UI guards the live branch with isSupabaseConfigured.
//   - UI preserves the offline/demo path.
//   - Migration adds kind + revoked_at to invite_codes.

const FN_PATH = resolve(process.cwd(), 'netlify', 'functions', 'provision-asociatie.ts');
const UI_PATH = resolve(process.cwd(), 'src', 'platform', 'PlatformAddAsociatiePage.tsx');
const MIGRATIONS_DIR = join(process.cwd(), 'supabase', 'migrations');

function allMigrationSql(): string {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => readFileSync(join(MIGRATIONS_DIR, f), 'utf8'))
    .join('\n');
}

// ── Netlify function static contract ─────────────────────────────────────────

describe('provision-asociatie function: request guards (T92)', () => {
  const src = readFileSync(FN_PATH, 'utf8');

  it('rejects non-POST methods', () => {
    expect(src).toContain("req.method !== 'POST'");
    expect(src).toContain('method-not-allowed');
  });

  it('returns 503 when Supabase admin env is missing', () => {
    expect(src).toContain('isSupabaseAdminConfigured()');
    expect(src).toContain('backend-not-configured');
    // The 503 check must precede any DB call.
    const adminConfigIdx = src.indexOf('isSupabaseAdminConfigured()');
    const supabaseAdminCallIdx = src.indexOf('supabaseAdmin()');
    expect(adminConfigIdx).toBeLessThan(supabaseAdminCallIdx);
  });

  it('resolves caller server-side via verifyBearerToken (never trusts client-supplied identity)', () => {
    expect(src).toContain('verifyBearerToken');
    expect(src).toContain('unauthorized');
    // The bearer check must come before the body parse so the payload is never
    // read before the caller is authenticated.
    const bearerIdx = src.indexOf('verifyBearerToken');
    const jsonIdx = src.indexOf('req.json()');
    expect(bearerIdx).toBeLessThan(jsonIdx);
  });

  it('returns 401 when bearer token is missing or invalid', () => {
    expect(src).toContain("json(401, { error: authError ?? 'unauthorized' })");
  });
});

describe('provision-asociatie function: authorization (T92)', () => {
  const src = readFileSync(FN_PATH, 'utf8');

  it('re-checks platform superadmin status server-side via platform_admins table', () => {
    expect(src).toContain("from('platform_admins')");
    expect(src).toContain('forbidden');
  });

  it('does not trust a client-supplied userId or role', () => {
    // The userId must come exclusively from verifyBearerToken, never from payload.
    expect(src).not.toContain('payload.userId');
    expect(src).not.toContain('payload.role');
    expect(src).not.toContain('body.userId');
    expect(src).not.toContain('body.role');
  });

  it('uses the verified userId from verifyBearerToken to check platform_admins', () => {
    // The service-role query must use the server-resolved userId, not a client value.
    expect(src).toContain('.eq(\'user_id\', userId)');
  });
});

describe('provision-asociatie function: payload validation (T92)', () => {
  const src = readFileSync(FN_PATH, 'utf8');

  it('validates adminName and adminEmail server-side', () => {
    // The function contains its own inline validation (mirroring validateAdminInvite
    // from platformProvisioningLogic) to avoid @/ import chains in tsconfig.node.json.
    expect(src).toContain("errors.adminName = 'required'");
    expect(src).toContain("errors.adminEmail = 'required'");
    expect(src).toContain("errors.adminEmail = 'email'");
    expect(src).toContain('validation-failed');
  });

  it('returns 422 on validation failure', () => {
    expect(src).toContain("json(422, { error: 'validation-failed'");
  });
});

describe('provision-asociatie function: invite creation (T92)', () => {
  const src = readFileSync(FN_PATH, 'utf8');

  it("creates the invite with kind='admin_setup'", () => {
    expect(src).toContain("kind: 'admin_setup'");
  });

  it('uses a 24-hour invite TTL (INVITE_TTL_MS = 24 * 60 * 60 * 1000)', () => {
    expect(src).toContain('INVITE_TTL_MS');
    expect(src).toContain('24 * 60 * 60 * 1000');
  });

  it('generates the token server-side and never reads it from the payload', () => {
    expect(src).toContain('generateToken()');
    expect(src).not.toContain('payload.token');
    expect(src).not.toContain('body.token');
  });

  it('creates the asociatii row before the invite row (dependency order)', () => {
    const asocIdx = src.indexOf("from('asociatii')");
    const inviteIdx = src.indexOf("from('invite_codes')");
    expect(asocIdx).toBeGreaterThan(0);
    expect(inviteIdx).toBeGreaterThan(asocIdx);
  });
});

describe('provision-asociatie function: email dispatch (T92)', () => {
  const src = readFileSync(FN_PATH, 'utf8');

  it('email dispatch is gated on isResendConfigured()', () => {
    expect(src).toContain('isResendConfigured()');
  });

  it('email dispatch is non-fatal (emailSent tracks result, not thrown)', () => {
    expect(src).toContain('emailSent = result.ok');
    // The function returns ok: true even when emailSent is false.
    expect(src).toContain('ok: true, inviteId, emailSent');
  });
});

describe('provision-asociatie function: privacy (T92)', () => {
  const src = readFileSync(FN_PATH, 'utf8');

  it('never calls console.log or console.error (no PII leakage via logs)', () => {
    expect(src).not.toMatch(/console\.(log|error|warn)\(/);
  });
});

// ── UI static contract ────────────────────────────────────────────────────────

describe('PlatformAddAsociatiePage live branch (T92)', () => {
  const src = readFileSync(UI_PATH, 'utf8');

  it('calls the provision-asociatie Netlify function endpoint', () => {
    expect(src).toContain('provision-asociatie');
  });

  it('sends the Authorization: Bearer header with the session access_token', () => {
    expect(src).toContain('Authorization');
    expect(src).toContain('Bearer');
    expect(src).toContain('access_token');
  });

  it('guards the live call with isSupabaseConfigured', () => {
    expect(src).toContain('isSupabaseConfigured');
    // The live fetch must appear inside the isSupabaseConfigured branch.
    const liveIdx = src.indexOf('isSupabaseConfigured');
    const fetchIdx = src.indexOf('provision-asociatie');
    expect(liveIdx).toBeLessThan(fetchIdx);
  });

  it('preserves the offline/demo path (inviteAdmin + markAdminEmailSent)', () => {
    expect(src).toContain('inviteAdmin');
    expect(src).toContain('markAdminEmailSent');
  });

  it('falls back to the local demo store when the backend is unavailable in DEV/demo', () => {
    expect(src).toContain('isDev()');
    expect(src).toContain('isDemo()');
    expect(src).toContain('setUsedLocalFallback(true)');
    expect(src).toContain('sentNoteDemo');
  });

  it('surfaces a user-facing error on 403 (not superadmin)', () => {
    expect(src).toContain('err.forbidden');
  });

  it('surfaces a user-facing error on other failures', () => {
    expect(src).toContain('err.provisionFailed');
  });
});

// ── Migration contract ────────────────────────────────────────────────────────

describe('invite_codes kind + revoked_at migration (T92)', () => {
  const sql = allMigrationSql();
  const flat = sql.toLowerCase().replace(/\s+/g, ' ');

  it("migration adds a 'kind' column to invite_codes", () => {
    expect(flat).toContain('alter table invite_codes add column if not exists kind text');
  });

  it("migration constrains kind to 'resident_invite' and 'admin_setup'", () => {
    expect(flat).toContain("'resident_invite'");
    expect(flat).toContain("'admin_setup'");
  });

  it('migration adds a revoked_at column to invite_codes', () => {
    expect(flat).toContain(
      'alter table invite_codes add column if not exists revoked_at timestamptz',
    );
  });
});

// ── Pure validation logic ─────────────────────────────────────────────────────

describe('validateAdminInvite (T92 payload contract)', () => {
  it('rejects an empty admin name', () => {
    const { value, errors } = validateAdminInvite({ adminName: '', adminEmail: 'a@test.ro' });
    expect(value).toBeNull();
    expect(errors.adminName).toBe('required');
  });

  it('rejects an admin name shorter than 2 characters', () => {
    const { value, errors } = validateAdminInvite({ adminName: 'X', adminEmail: 'a@test.ro' });
    expect(value).toBeNull();
    expect(errors.adminName).toBe('tooShort');
  });

  it('rejects an empty admin email', () => {
    const { value, errors } = validateAdminInvite({ adminName: 'Ana Pop', adminEmail: '' });
    expect(value).toBeNull();
    expect(errors.adminEmail).toBe('required');
  });

  it('rejects a malformed admin email', () => {
    const { value, errors } = validateAdminInvite({
      adminName: 'Ana Pop',
      adminEmail: 'notanemail',
    });
    expect(value).toBeNull();
    expect(errors.adminEmail).toBe('email');
  });

  it('accepts a valid name and email, trimming whitespace', () => {
    const { value, errors } = validateAdminInvite({
      adminName: '  Ion Popescu  ',
      adminEmail: '  ion@bloc.ro  ',
    });
    expect(Object.keys(errors)).toHaveLength(0);
    expect(value).not.toBeNull();
    expect(value?.adminName).toBe('Ion Popescu');
    expect(value?.adminEmail).toBe('ion@bloc.ro');
  });

  it('accepts a name with exactly 2 characters', () => {
    const { value } = validateAdminInvite({ adminName: 'AB', adminEmail: 'ab@x.ro' });
    expect(value).not.toBeNull();
  });
});
