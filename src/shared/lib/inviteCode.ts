const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous 0/O/1/I
const CODE_LENGTH = 8;
const CODE_RE = /^[A-Z2-9]{8}$/;

/** Generate an 8-character unambiguous alphanumeric invite code. */
export function generateInviteCode(rng: () => number = Math.random): string {
  let out = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += ALPHABET[Math.floor(rng() * ALPHABET.length)];
  }
  return out;
}

/** Validate the shape of an invite code (does not check consumption). */
export function isValidInviteCodeFormat(code: string): boolean {
  return CODE_RE.test(code.trim().toUpperCase());
}

/** Normalise user input to the canonical code form. */
export function normalizeInviteCode(code: string): string {
  return code.trim().toUpperCase().replace(/[^A-Z2-9]/g, '');
}

/**
 * Onboarding tokens (T123): the short 8-char code above is a human-friendly
 * manual-entry fallback, but the primary handoff is a deep link carrying an
 * opaque, high-entropy token. 32 bytes (256 bits) rendered as lower-case hex,
 * so it is unguessable, URL-safe, and never collides in practice. The token is
 * generated client-side here for the offline path; storing it hashed at rest on
 * the live backend is the separate concern T128.
 */
const TOKEN_BYTES = 32;
const TOKEN_RE = /^[0-9a-f]{64}$/;

/**
 * Generate an opaque high-entropy onboarding token (64 lower-case hex chars).
 * `fill` is injectable so tests can make it deterministic; it defaults to the
 * platform CSPRNG (`crypto.getRandomValues`).
 */
export function generateInviteToken(
  fill: (bytes: Uint8Array) => void = (bytes) => crypto.getRandomValues(bytes),
): string {
  const bytes = new Uint8Array(TOKEN_BYTES);
  fill(bytes);
  let out = '';
  for (const b of bytes) out += b.toString(16).padStart(2, '0');
  return out;
}

/** Validate the shape of an onboarding token (does not check consumption). */
export function isValidInviteToken(token: string): boolean {
  return TOKEN_RE.test(token.trim().toLowerCase());
}

/** Normalise a token from a link query param to its canonical form. */
export function normalizeInviteToken(token: string): string {
  return token.trim().toLowerCase();
}

/**
 * The app path an onboarding deep link resolves to: the account-creation-on-
 * redemption landing (T124), which reads the `?token=` query param, lets the
 * invitee set a password and consumes the token. Kept as a single constant so
 * both link builders (the locatar invite link in `inviteLogic` and the admin
 * setup link in `platformProvisioningLogic`) stay in sync. The legacy
 * `/onboarding/alatura` route redirects here so links minted before T124 still
 * resolve.
 */
export const ONBOARDING_REDEEM_PATH = '/configurare-cont';

/**
 * Build an absolute onboarding deep link from a base URL (callers pass
 * `env.appUrl`, which is `VITE_APP_URL` or the current origin) and a token.
 * Pure: no env or browser access, so it unit-tests in isolation. The base URL's
 * trailing slash is normalised away so the path is never doubled.
 */
export function buildOnboardingLink(baseUrl: string, token: string): string {
  const base = baseUrl.replace(/\/+$/, '');
  return `${base}${ONBOARDING_REDEEM_PATH}?token=${encodeURIComponent(token)}`;
}
