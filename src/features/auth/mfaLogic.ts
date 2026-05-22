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

/** Stable i18n keys (under `auth.mfa.err`) for the 2FA error states we surface. */
export type MfaErrorKey =
  | 'invalidCode'
  | 'recoveryLiveUnavailable'
  | 'notEnrolled'
  | 'generic';

/**
 * Map an internal code or opaque Supabase MFA error onto a stable bilingual key,
 * so the UI copy never leaks raw backend text. Checked most-specific first.
 */
export function mfaErrorKey(error: string | null | undefined): MfaErrorKey {
  if (!error) return 'generic';
  const e = error.toLowerCase();
  if (e.includes('recovery-live-unavailable')) return 'recoveryLiveUnavailable';
  if (e.includes('not-enrolled')) return 'notEnrolled';
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
