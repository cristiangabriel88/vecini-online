/**
 * Pure two-factor-authentication (TOTP) logic shared by the security settings
 * surface and the login challenge step (T02).
 *
 * Like `authLogic`, this module holds no React and no Supabase imports so it can
 * be unit-tested in isolation: a self-contained RFC 6238 (TOTP) / RFC 4226
 * (HOTP) implementation over Web Crypto, base32 codec, single-use recovery-code
 * generation/hashing/consumption, the role-enforcement rule, and the AAL state
 * machine that decides whether a signed-in session still owes a second factor.
 *
 * The cryptography is real: in demo mode (no Supabase backend) the app genuinely
 * verifies codes produced by a standard authenticator app against the enrolled
 * secret, so the flow is faithful and fully exercisable offline. The live path
 * delegates verification to Supabase MFA; this module still drives its formatting
 * and recovery codes.
 */
import type { Role } from '@/shared/types/domain';

/** TOTP time step, in seconds (the authenticator-app standard). */
export const TOTP_PERIOD = 30;
/** Number of digits in a TOTP code. */
export const TOTP_DIGITS = 6;
/** How many single-use recovery codes are minted per enrollment. */
export const RECOVERY_CODE_COUNT = 10;

/** RFC 4648 base32 alphabet (no padding when we encode secrets). */
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
/**
 * Recovery-code alphabet: 32 unambiguous characters (no I, O, 0, 1). Length 32
 * divides 256 evenly, so `byte % 32` draws each character with equal
 * probability — no modulo bias.
 */
const RECOVERY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** The Web Crypto implementation (browser and Node 18+ both expose it). */
function webcrypto(): Crypto {
  return globalThis.crypto;
}

/** Copy bytes into a plain ArrayBuffer (a definite `BufferSource` for Web Crypto). */
function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const ab = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(ab).set(bytes);
  return ab;
}

/** Decode an RFC 4648 base32 string (case-insensitive, padding tolerated). */
export function base32Decode(input: string): Uint8Array {
  const clean = input.replace(/=+$/, '').replace(/\s/g, '').toUpperCase();
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = BASE32_ALPHABET.indexOf(ch);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}

/** Encode bytes as an unpadded RFC 4648 base32 string. */
export function base32Encode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

/** Generate a fresh base32 TOTP secret (160 bits, the recommended length). */
export function generateTotpSecret(): string {
  const bytes = new Uint8Array(20);
  webcrypto().getRandomValues(bytes);
  return base32Encode(bytes);
}

/** RFC 4226 HOTP: HMAC-SHA1 over an 8-byte big-endian counter, dynamically truncated. */
export async function hotp(secret: string, counter: number, digits = TOTP_DIGITS): Promise<string> {
  const keyBytes = base32Decode(secret);
  const buf = new ArrayBuffer(8);
  const view = new DataView(buf);
  view.setUint32(0, Math.floor(counter / 2 ** 32));
  view.setUint32(4, counter >>> 0);
  const key = await webcrypto().subtle.importKey(
    'raw',
    toArrayBuffer(keyBytes),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );
  const sig = new Uint8Array(await webcrypto().subtle.sign('HMAC', key, buf));
  const offset = sig[sig.length - 1] & 0x0f;
  const bin =
    ((sig[offset] & 0x7f) << 24) |
    (sig[offset + 1] << 16) |
    (sig[offset + 2] << 8) |
    sig[offset + 3];
  return (bin % 10 ** digits).toString().padStart(digits, '0');
}

/** RFC 6238 TOTP: the HOTP of the current 30-second time step. */
export async function totp(
  secret: string,
  atMs: number = Date.now(),
  digits = TOTP_DIGITS,
  period = TOTP_PERIOD,
): Promise<string> {
  const counter = Math.floor(atMs / 1000 / period);
  return hotp(secret, counter, digits);
}

/** Whether a string is a syntactically valid TOTP code (exactly `digits` digits). */
export function isValidTotpFormat(code: string, digits = TOTP_DIGITS): boolean {
  return new RegExp(`^\\d{${digits}}$`).test(code.trim());
}

interface VerifyOptions {
  atMs?: number;
  /** Adjacent time steps to also accept, absorbing clock drift (default 1 = +/-30s). */
  window?: number;
  digits?: number;
  period?: number;
}

/** Verify a TOTP code against the secret, tolerating a small drift window. */
export async function verifyTotp(
  secret: string,
  code: string,
  { atMs = Date.now(), window = 1, digits = TOTP_DIGITS, period = TOTP_PERIOD }: VerifyOptions = {},
): Promise<boolean> {
  if (!isValidTotpFormat(code, digits)) return false;
  const trimmed = code.trim();
  const counter = Math.floor(atMs / 1000 / period);
  for (let i = -window; i <= window; i++) {
    if ((await hotp(secret, counter + i, digits)) === trimmed) return true;
  }
  return false;
}

/** Build the `otpauth://` URI an authenticator app reads from a QR or manual entry. */
export function buildOtpAuthUri(opts: { secret: string; account: string; issuer: string }): string {
  const label = encodeURIComponent(`${opts.issuer}:${opts.account}`);
  const params = new URLSearchParams({
    secret: opts.secret,
    issuer: opts.issuer,
    algorithm: 'SHA1',
    digits: String(TOTP_DIGITS),
    period: String(TOTP_PERIOD),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

/** Mint a fresh batch of human-friendly recovery codes, formatted `XXXX-XXXX`. */
export function generateRecoveryCodes(count = RECOVERY_CODE_COUNT): string[] {
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const bytes = new Uint8Array(8);
    webcrypto().getRandomValues(bytes);
    let s = '';
    for (const b of bytes) s += RECOVERY_ALPHABET[b % RECOVERY_ALPHABET.length];
    out.push(`${s.slice(0, 4)}-${s.slice(4, 8)}`);
  }
  return out;
}

/** Canonicalise a recovery code for comparison (strip spaces/dashes, upper-case). */
export function normalizeRecoveryCode(code: string): string {
  return code.replace(/[\s-]/g, '').toUpperCase();
}

/** SHA-256 hash (hex) of a normalised recovery code — we never store the plaintext. */
export async function hashRecoveryCode(code: string): Promise<string> {
  const data = new TextEncoder().encode(normalizeRecoveryCode(code));
  const digest = await webcrypto().subtle.digest('SHA-256', toArrayBuffer(data));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Hash a whole batch of recovery codes for storage. */
export function hashRecoveryCodes(codes: string[]): Promise<string[]> {
  return Promise.all(codes.map(hashRecoveryCode));
}

/**
 * Consume a recovery code: returns whether the input matched a stored hash and,
 * if so, the remaining hashes with that one removed (single-use). Comparison is
 * over the canonical form, so spacing/case in the input does not matter.
 */
export async function consumeRecoveryCode(
  remainingHashes: string[],
  input: string,
): Promise<{ matched: boolean; remaining: string[] }> {
  const h = await hashRecoveryCode(input);
  if (!remainingHashes.includes(h)) return { matched: false, remaining: remainingHashes };
  return { matched: true, remaining: remainingHashes.filter((x) => x !== h) };
}

/**
 * Roles for which two-factor authentication is mandatory. These hold privileged
 * access to other residents' data and association funds, so they carry the
 * highest account-takeover risk.
 */
export const MFA_REQUIRED_ROLES: readonly Role[] = [
  'super_admin',
  'admin',
  'presedinte',
  'comitet',
  'cenzor',
];

/** Whether a single role must enrol in 2FA. `null`/`undefined` (resident/demo) does not. */
export function requiresMfa(role: Role | null | undefined): boolean {
  return role != null && MFA_REQUIRED_ROLES.includes(role);
}

/** Whether any of the user's memberships put them in a 2FA-mandatory role. */
export function anyRoleRequiresMfa(roles: Role[]): boolean {
  return roles.some(requiresMfa);
}

/** The in-app route a session is steered to when it still owes a second factor. */
export const MFA_SECURITY_PATH = '/app/securitate';

/**
 * Security enforcement posture for the in-app 2FA gate.
 *
 * - `strict` (default, production): a privileged session must set up and pass a
 *   second factor before reaching any in-app route. Safe default.
 * - `relaxed` (opt-in, for local/self-hosted/dev, e.g. the Raspberry Pi): the
 *   gate never forces a privileged session onto the security page, so the local
 *   admin can navigate the app normally. The security page stays reachable so
 *   MFA can still be set up voluntarily.
 *
 * Chosen by the `VITE_SECURITY_ENFORCEMENT` env var; anything other than an
 * explicit `relaxed` resolves to `strict`, so a typo never weakens production.
 */
export type SecurityEnforcement = 'strict' | 'relaxed';

/** Parse the configured enforcement posture; defaults to the safe `strict`. */
export function parseSecurityEnforcement(
  raw: string | undefined | null,
): SecurityEnforcement {
  return (raw ?? '').trim().toLowerCase() === 'relaxed' ? 'relaxed' : 'strict';
}

/** Inputs to the in-app 2FA enforcement decision (kept pure for testing). */
export interface MfaEnforcementInput {
  /** Whether a real Supabase backend is configured (demo mode is never gated). */
  supabaseConfigured: boolean;
  /** Whether the enrolment status has been resolved at least once. */
  loaded: boolean;
  /** The active role of the signed-in session. */
  role: Role | null | undefined;
  /** Whether a verified second factor is active for the account. */
  enrolled: boolean;
  /**
   * Whether this session has actually satisfied the AAL2 challenge (T102). Only
   * meaningful once `enrolled` is true — an un-enrolled session has no factor to
   * satisfy. Left optional and treated as satisfied when omitted (or before it
   * has resolved), so the axis is opt-in and never steers on a flash of unknown
   * AAL; only a resolved `false` (enrolled but still at AAL1) re-gates the shell.
   */
  aalSatisfied?: boolean;
  /**
   * Whether this session passed an app-defined second factor this session (the
   * email or Telegram one-time-code channels, T139+). Native Supabase MFA only
   * grants AAL2 for TOTP/phone, so these channels cannot move `aalSatisfied`;
   * instead a server-verified, session-bound `app_2fa_at` claim records that the
   * session passed one. A resolved `true` here satisfies the gate exactly like
   * `aalSatisfied`, so a user whose only second factor is email/Telegram is not
   * trapped on the security page. Optional: omitted leaves the axis inert.
   */
  app2faSatisfied?: boolean;
  /** The current in-app location. */
  pathname: string;
  /** Where to steer to; defaults to the security page. */
  securityPath?: string;
  /**
   * Enforcement posture. Defaults to `strict` (production). In `relaxed` mode
   * the gate never forces a redirect, so local/self-hosted admins are not
   * trapped on the security page.
   */
  enforcement?: SecurityEnforcement;
}

/**
 * The in-app 2FA enforcement decision (T02/T30/T102). On the live
 * (Supabase-backed) path a signed-in member in a 2FA-mandatory role is steered
 * to the security page and cannot reach any other in-app route when it has
 * either (a) not yet enrolled a second factor, or (b) enrolled one but not yet
 * satisfied the AAL2 challenge in this session (a skipped challenge, a stale
 * tab, an expired step-up, or a direct deep-link). Being merely enrolled is not
 * enough; the session must have passed the second factor. The gate is
 * deliberately inert when:
 *
 * - no backend is configured (demo mode has no real role, stays inspectable),
 * - the enrolment status is not yet known (avoids steering on a flash of null),
 * - the role is not privileged (a resident is never gated), or
 * - the session is already on the security page (so enrolling/recovering is
 *   reachable), or a verified factor is enrolled AND the second factor is
 *   satisfied this session (native AAL2, or an app-defined email/Telegram
 *   channel via `app2faSatisfied`; or neither status has resolved yet).
 *
 * Returns the path to redirect to, or null when the current location is allowed.
 */
export function mfaEnforcementRedirect(input: MfaEnforcementInput): string | null {
  const securityPath = input.securityPath ?? MFA_SECURITY_PATH;
  if (!input.supabaseConfigured) return null;
  // Relaxed (opt-in) enforcement never forces the redirect; the security page is
  // still reachable for voluntary setup. Production defaults to strict.
  if (input.enforcement === 'relaxed') return null;
  if (!input.loaded) return null;
  if (!requiresMfa(input.role)) return null;
  if (input.pathname === securityPath) return null;
  // Not enrolled at all: must set up a second factor before reaching the shell.
  if (!input.enrolled) return securityPath;
  // Enrolled but this session has passed no second factor: re-gate it. A session
  // counts as having passed when either the native AAL2 challenge is satisfied
  // (TOTP/phone) or an app-defined channel was verified (email/Telegram). Only a
  // resolved failure on both axes re-gates, so an unresolved status never steers.
  if (input.aalSatisfied === false && input.app2faSatisfied !== true) return securityPath;
  return null;
}

/** Stable i18n keys (under `auth.mfa.err`) for the 2FA error states we surface. */
export type MfaErrorKey =
  | 'invalidCode'
  | 'recoveryLiveUnavailable'
  | 'notEnrolled'
  | 'expiredCode'
  | 'noChannel'
  | 'deliveryFailed'
  | 'channelLocked'
  | 'generic';

/**
 * Map an internal code or opaque Supabase MFA error onto a stable bilingual key,
 * so the UI copy never leaks raw backend text. Checked most-specific first.
 *
 * The delivered-code channels (email/Telegram, T139+) add: `expired-code` (the
 * one-time code's window lapsed), `no-channel` (the channel is not enabled, e.g.
 * Telegram is not linked), `delivery-failed` (the email/Telegram send did not go
 * through), and `channel-locked` (too many wrong codes on this channel).
 */
export function mfaErrorKey(error: string | null | undefined): MfaErrorKey {
  if (!error) return 'generic';
  const e = error.toLowerCase();
  if (e.includes('recovery-live-unavailable')) return 'recoveryLiveUnavailable';
  if (e.includes('not-enrolled')) return 'notEnrolled';
  if (e.includes('expired')) return 'expiredCode';
  if (e.includes('no-channel')) return 'noChannel';
  if (e.includes('delivery')) return 'deliveryFailed';
  if (e.includes('channel-locked')) return 'channelLocked';
  if (e.includes('invalid')) return 'invalidCode';
  return 'generic';
}

/** Supabase Authenticator Assurance Levels. */
export type Aal = 'aal1' | 'aal2' | null;

/**
 * Whether a signed-in session still owes a second factor: it does when the
 * current level is aal1 but the next required level is aal2 (i.e. the user has a
 * verified TOTP factor that this session has not yet satisfied).
 */
export function challengeNeeded(current: Aal, next: Aal): boolean {
  return current === 'aal1' && next === 'aal2';
}
