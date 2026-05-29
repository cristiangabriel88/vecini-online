/**
 * Pure logic for per-user notification email preferences (T14).
 *
 * Dependency-free so it can be imported by both the client (offline store,
 * preference UI) and Netlify functions (quiet-hours gate in the dispatch).
 * Uses only relative imports -- no @/ aliases.
 */

export interface NotifEmailPrefs {
  /** Whether the user has opted into email notifications. Default: true. */
  emailEnabled: boolean;
  /**
   * Quiet hours: hour of day (0-23, local time) when the quiet window starts.
   * null means no quiet hours configured.
   */
  quietHoursStart: number | null;
  /**
   * Quiet hours: hour of day (0-23, local time) when the quiet window ends
   * (exclusive). null means no quiet hours configured.
   */
  quietHoursEnd: number | null;
  /** IANA timezone string for quiet-hours calculation. */
  timezone: string;
}

export const DEFAULT_TIMEZONE = 'Europe/Bucharest';

export function defaultNotifEmailPrefs(): NotifEmailPrefs {
  return {
    emailEnabled: true,
    quietHoursStart: null,
    quietHoursEnd: null,
    timezone: DEFAULT_TIMEZONE,
  };
}

/**
 * Returns the current hour (0-23) in the given IANA timezone.
 * Falls back to UTC hour on an invalid timezone string.
 */
export function hourInTimezone(nowMs: number, timezone: string): number {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      hour12: false,
      timeZone: timezone,
    }).formatToParts(new Date(nowMs));
    const hourPart = parts.find((p) => p.type === 'hour');
    if (!hourPart) return new Date(nowMs).getUTCHours();
    const h = parseInt(hourPart.value, 10);
    return isNaN(h) ? new Date(nowMs).getUTCHours() : h % 24;
  } catch {
    return new Date(nowMs).getUTCHours();
  }
}

/**
 * Returns true when `nowMs` falls within the configured quiet-hours window.
 * Handles wrap-around: start=22, end=8 means 22:00-07:59 is quiet.
 */
export function isInQuietHours(prefs: NotifEmailPrefs, nowMs: number): boolean {
  const { quietHoursStart: start, quietHoursEnd: end, timezone } = prefs;
  if (start === null || end === null) return false;
  const hour = hourInTimezone(nowMs, timezone);
  if (start === end) return true; // entire day is quiet
  if (start < end) return hour >= start && hour < end; // non-wrapping window
  return hour >= start || hour < end; // wrapping window (e.g. 22-08)
}

export type NotifPriority = 'low' | 'normal' | 'urgent';

/**
 * Decide whether to send an email notification given user preferences.
 *
 * - urgent: always send (bypasses emailEnabled + quiet hours).
 * - emailEnabled false: suppress.
 * - Inside quiet hours: suppress (non-urgent only).
 * - Otherwise: send.
 */
export function shouldSendEmailNotif(
  prefs: NotifEmailPrefs,
  priority: NotifPriority,
  nowMs: number,
): boolean {
  if (priority === 'urgent') return true;
  if (!prefs.emailEnabled) return false;
  if (isInQuietHours(prefs, nowMs)) return false;
  return true;
}

/** Validate a 0-23 quiet-hours hour value. */
export function isValidQuietHour(h: unknown): h is number {
  return typeof h === 'number' && Number.isInteger(h) && h >= 0 && h <= 23;
}
