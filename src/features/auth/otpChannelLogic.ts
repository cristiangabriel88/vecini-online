/**
 * Pure logic for the delivered-code second-factor channels (email + Telegram,
 * T139+). These sit alongside the authenticator-app TOTP factor in `mfaLogic`
 * for users who do not have an authenticator app and are not technical: a short
 * numeric one-time code (and, for email, an equivalent click-to-confirm link) is
 * delivered out of band and typed/clicked back.
 *
 * Like `mfaLogic`, this module holds no React and no Supabase imports so it can
 * be unit-tested in isolation: unbiased numeric-OTP minting over Web Crypto,
 * salted SHA-256 hashing (we never store the plaintext code or link token), a
 * high-entropy confirm token, the expiry / resend-cooldown clocks, and the
 * target-masking helpers. The cryptography is real, so demo mode genuinely mints
 * and verifies codes offline exactly as the live path does server-side.
 *
 * Why this is a separate factor and not native Supabase MFA: Supabase grants a
 * session real AAL2 only for `totp`/`phone` factor types. Email and Telegram are
 * verified by our own service-role function, which records a session-bound
 * `app_2fa_at` claim; the enforcement gate consumes that via the
 * `app2faSatisfied` axis in `mfaLogic.mfaEnforcementRedirect`.
 */

/** Number of digits in a delivered one-time code. */
export const OTP_LENGTH = 6;
/** How long a delivered code stays valid after it is minted. */
export const OTP_TTL_MS = 10 * 60_000;
/** Minimum wait between two code requests on the same channel. */
export const OTP_RESEND_COOLDOWN_MS = 60_000;

/**
 * The second-factor channels a user can hold. `totp` is the authenticator-app
 * factor owned by `mfaLogic`; `email` and `telegram` are the delivered-code
 * channels this module manages.
 */
export type MfaChannel = 'totp' | 'email' | 'telegram';

/** The channels whose codes this module mints and verifies (TOTP is separate). */
export const DELIVERED_OTP_CHANNELS: readonly MfaChannel[] = ['email', 'telegram'];

/** Whether a channel is one of the delivered-code channels handled here. */
export function isDeliveredChannel(channel: MfaChannel): boolean {
  return DELIVERED_OTP_CHANNELS.includes(channel);
}

/** The Web Crypto implementation (browser and Node 18+ both expose it). */
function webcrypto() {
  return globalThis.crypto;
}

/** Copy bytes into a plain ArrayBuffer (a definite `BufferSource` for Web Crypto). */
function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const ab = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(ab).set(bytes);
  return ab;
}

/** Lower-case hex of a byte array. */
function toHex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** SHA-256 (hex) of a UTF-8 string. Shared by the code and token hashing below. */
async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await webcrypto().subtle.digest('SHA-256', toArrayBuffer(data));
  return toHex(new Uint8Array(digest));
}

/**
 * Mint a numeric one-time code with no modulo bias. Each digit is drawn from a
 * uniformly random byte using rejection sampling (bytes >= 250 are discarded, so
 * the accepted range 0..249 maps evenly onto 0..9), mirroring the unbiased-draw
 * care taken in `mfaLogic.generateRecoveryCodes`.
 */
export function generateNumericOtp(length = OTP_LENGTH): string {
  const crypto = webcrypto();
  let out = '';
  while (out.length < length) {
    const buf = new Uint8Array(length);
    crypto.getRandomValues(buf);
    for (const b of buf) {
      if (out.length >= length) break;
      if (b >= 250) continue; // 250 = 25 * 10: keep the largest unbiased range.
      out += String(b % 10);
    }
  }
  return out;
}

/** Strip spacing from a delivered code for comparison; digits only otherwise. */
export function normalizeOtp(code: string): string {
  return code.replace(/\s/g, '');
}

/** Whether a string is a syntactically valid delivered code (exactly N digits). */
export function isValidOtpFormat(code: string, length = OTP_LENGTH): boolean {
  return new RegExp(`^\\d{${length}}$`).test(normalizeOtp(code));
}

/** A random per-challenge salt (hex) so identical codes never share a hash. */
export function generateOtpSalt(): string {
  const bytes = new Uint8Array(16);
  webcrypto().getRandomValues(bytes);
  return toHex(bytes);
}

/** Salted SHA-256 (hex) of a delivered code. Only the hash + salt are stored. */
export function hashOtp(code: string, salt: string): Promise<string> {
  return sha256Hex(`${salt}:${normalizeOtp(code)}`);
}

/**
 * Constant-time comparison of two equal-length hex strings, so verifying a code
 * does not leak how much of the hash matched through timing. Returns false on a
 * length mismatch (which is itself not secret).
 */
export function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Verify a submitted code against a stored salted hash, in constant time. */
export async function verifyOtpHash(
  storedHash: string,
  salt: string,
  input: string,
): Promise<boolean> {
  if (!isValidOtpFormat(input)) return false;
  return timingSafeEqualHex(await hashOtp(input, salt), storedHash);
}

/** A high-entropy, URL-safe confirm-link token (independent of the numeric code). */
export function generateConfirmToken(): string {
  const bytes = new Uint8Array(32);
  webcrypto().getRandomValues(bytes);
  // base64url without padding, so the token is safe in a query string.
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** SHA-256 (hex) of a confirm token. Only the hash is stored; the link carries the plaintext. */
export function hashConfirmToken(token: string): Promise<string> {
  return sha256Hex(token);
}

/** The instant a code minted at `createdAtMs` stops being valid. */
export function otpExpiresAt(createdAtMs: number, ttlMs = OTP_TTL_MS): number {
  return createdAtMs + ttlMs;
}

/** Whether a code whose validity ends at `expiresAtMs` has lapsed by `now`. */
export function otpChallengeExpired(expiresAtMs: number, now: number = Date.now()): boolean {
  return now >= expiresAtMs;
}

/** Milliseconds left before another code may be requested on the same channel (0 when ready). */
export function resendCooldownRemainingMs(
  lastSentMs: number,
  now: number = Date.now(),
  cooldownMs = OTP_RESEND_COOLDOWN_MS,
): number {
  return Math.max(0, lastSentMs + cooldownMs - now);
}

/**
 * Mask an email into a privacy-safe display hint, e.g. `ana.popescu@gmail.com`
 * becomes `an***@gmail.com`. Keeps at most the first two characters of the local
 * part; a one-character local part is fully masked. Never widens what is shown
 * beyond what the account already knows about itself.
 */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf('@');
  if (at <= 0) return '***';
  const local = email.slice(0, at);
  const domain = email.slice(at);
  const keep = local.length <= 2 ? local.slice(0, 1) : local.slice(0, 2);
  return `${keep}***${domain}`;
}

/** Mask a Telegram display name/handle to a short, privacy-safe hint. */
export function maskTelegram(handle: string): string {
  const h = handle.replace(/^@/, '');
  if (h.length === 0) return 'Telegram';
  const keep = h.slice(0, 1);
  return `@${keep}***`;
}
