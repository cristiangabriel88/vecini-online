/** F06 — neighbour posts auto-archive after a fixed lifetime (default 14 days). */
export const LOCATOR_LIFETIME_DAYS = 14;

/** Compute the expiry timestamp for a post created at `createdAt`. */
export function expiresAt(createdAt: Date = new Date(), days = LOCATOR_LIFETIME_DAYS): Date {
  return new Date(createdAt.getTime() + days * 86_400_000);
}

/** Whether a post is past its expiry and should be hidden/archived. */
export function isExpired(expiry: string | Date, now: Date = new Date()): boolean {
  return new Date(expiry).getTime() <= now.getTime();
}

/** Whole days remaining before expiry (0 once expired). */
export function daysLeft(expiry: string | Date, now: Date = new Date()): number {
  const ms = new Date(expiry).getTime() - now.getTime();
  return ms <= 0 ? 0 : Math.ceil(ms / 86_400_000);
}
