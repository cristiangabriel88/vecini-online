/**
 * Authentication audit-event model (T03).
 *
 * A privacy-preserving stream of security-relevant auth events (sign-in, failed
 * sign-in, sign-out, password and MFA changes) the resident can review. Pure and
 * dependency-free so it unit-tests in isolation and the same shape is used by the
 * demo log and the live `auth_audit_events` table.
 *
 * Privacy rule (enforced here, not just by convention): an event NEVER carries a
 * password, token, code, or a full email. The only identifier kept is a masked
 * email (`a***@vecini.online`) so a resident can recognise their own activity
 * without the log itself becoming a directory of plaintext addresses.
 */

export type AuthEventType =
  | 'login'
  | 'loginFailed'
  | 'loginLocked'
  | 'logout'
  | 'logoutEverywhere'
  | 'passwordChanged'
  | 'passwordResetRequested'
  | 'mfaEnabled'
  | 'mfaDisabled'
  | 'recoveryCodesRegenerated';

/** The full set, handy for exhaustive locale coverage and iteration. */
export const AUTH_EVENT_TYPES: AuthEventType[] = [
  'login',
  'loginFailed',
  'loginLocked',
  'logout',
  'logoutEverywhere',
  'passwordChanged',
  'passwordResetRequested',
  'mfaEnabled',
  'mfaDisabled',
  'recoveryCodesRegenerated',
];

export interface AuthAuditEvent {
  /** What happened. Maps to a stable bilingual label key. */
  type: AuthEventType;
  /** ISO timestamp the event was recorded. */
  at: string;
  /** Masked email, or null when no email applies. Never a full address. */
  emailMask: string | null;
}

/**
 * Mask an email so it identifies without disclosing: keep the first character of
 * the local-part and the domain, replace the rest with `***`. Returns null for a
 * missing or malformed value so we never accidentally store raw text.
 */
export function redactEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const trimmed = email.trim();
  const at = trimmed.indexOf('@');
  if (at <= 0 || at === trimmed.length - 1) return null;
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  const first = local[0]?.toLowerCase() ?? '';
  return `${first}***@${domain.toLowerCase()}`;
}

/**
 * Build an audit event, redacting the email. The signature accepts only a type
 * and an optional email by design: there is no parameter through which a secret
 * could be attached to the record.
 */
export function buildAuthEvent(
  type: AuthEventType,
  email?: string | null,
  now: Date = new Date(),
): AuthAuditEvent {
  return { type, at: now.toISOString(), emailMask: redactEmail(email) };
}

/** Cap on how many events the local (demo) log retains. */
export const MAX_LOCAL_EVENTS = 50;
