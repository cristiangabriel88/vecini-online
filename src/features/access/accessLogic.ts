import type { AccessCode } from '@/shared/types/domain';

/** Courier codes are valid for 30 minutes (spec F32). */
export const CODE_TTL_MINUTES = 30;

/** Generate a 6-digit numeric code. `rng` is injectable for tests. */
export function generateCode(rng: () => number = Math.random): string {
  return String(Math.floor(rng() * 1_000_000)).padStart(6, '0');
}

/** Expiry timestamp for a code generated at `from`. */
export function expiryFrom(from: Date | string | number = new Date()): string {
  return new Date(new Date(from).getTime() + CODE_TTL_MINUTES * 60_000).toISOString();
}

/** A code is active when it has not been used and has not expired. */
export function isActive(code: AccessCode, now: Date | string | number = new Date()): boolean {
  if (code.used_at) return false;
  return new Date(code.expires_at).getTime() > new Date(now).getTime();
}

/** Whole minutes left before a code expires (0 once expired). */
export function minutesLeft(code: AccessCode, now: Date | string | number = new Date()): number {
  const ms = new Date(code.expires_at).getTime() - new Date(now).getTime();
  return ms <= 0 ? 0 : Math.ceil(ms / 60_000);
}

/** Codes ordered newest first. */
export function sortedCodes(codes: AccessCode[]): AccessCode[] {
  return [...codes].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}
