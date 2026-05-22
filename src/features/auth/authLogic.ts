/**
 * Pure authentication logic shared by the login/sign-up/password-reset surface.
 *
 * This module holds no React and no Supabase imports so it can be unit-tested in
 * isolation: form validation, the mapping of opaque Supabase auth errors onto
 * stable bilingual i18n keys, and the small state machine that drives which form
 * the auth page shows. The store and pages build on top of it.
 *
 * Note on scope: T01 wires real Supabase email + password auth (sign-up, login,
 * email verification, password reset) while keeping the demo fallback intact.
 * Full password-strength policy and known-breach rejection are deliberately left
 * to T03 (auth & session hardening); here we enforce only a minimum length so a
 * trivially weak password is rejected before it ever reaches the network.
 */

/** Which form the auth page is presenting. */
export type AuthMode = 'signIn' | 'signUp' | 'forgot';

/** Minimum password length accepted at sign-up (T03 tightens this further). */
export const MIN_PASSWORD_LENGTH = 8;

/** Pragmatic email shape check — the real validation is the verification email. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

export type PasswordIssue = 'tooShort';

/** Returns the first reason a password is unacceptable, or null when it passes. */
export function validatePassword(password: string): PasswordIssue | null {
  if (password.length < MIN_PASSWORD_LENGTH) return 'tooShort';
  return null;
}

export interface AuthFormValues {
  email: string;
  password: string;
  confirmPassword: string;
}

/**
 * Whether the form for the given mode is complete and internally valid enough to
 * submit. Keeps the submit button's disabled state and the store in agreement.
 */
export function canSubmit(mode: AuthMode, values: AuthFormValues): boolean {
  if (!isValidEmail(values.email)) return false;
  if (mode === 'forgot') return true;
  if (validatePassword(values.password)) return false;
  if (mode === 'signUp' && values.password !== values.confirmPassword) return false;
  return true;
}

/**
 * Stable i18n keys (under the `auth.err` namespace) for the auth error states we
 * surface to the resident. `mapAuthError` resolves a Supabase error message onto
 * one of these so the UI copy stays bilingual and never leaks raw backend text.
 */
export type AuthErrorKey =
  | 'invalidCredentials'
  | 'emailNotConfirmed'
  | 'emailTaken'
  | 'weakPassword'
  | 'rateLimited'
  | 'samePassword'
  | 'generic';

/**
 * Map an opaque Supabase auth error message to one of our stable keys. Supabase
 * does not expose machine-readable codes consistently across flows, so we match
 * on the documented message text, case-insensitively, and fall back to a generic
 * key so an unrecognised error still shows friendly copy rather than nothing.
 */
export function mapAuthError(message: string | null | undefined): AuthErrorKey {
  if (!message) return 'generic';
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials') || m.includes('invalid credentials')) {
    return 'invalidCredentials';
  }
  if (m.includes('email not confirmed') || m.includes('not confirmed')) {
    return 'emailNotConfirmed';
  }
  if (m.includes('already registered') || m.includes('already been registered') || m.includes('user already')) {
    return 'emailTaken';
  }
  // Checked before the weak-password rule because Supabase's "should be
  // different from the old password" also contains the substring "should be".
  if (m.includes('should be different') || m.includes('same as the old')) {
    return 'samePassword';
  }
  if (m.includes('password should be at least') || m.includes('weak password') || m.includes('at least')) {
    return 'weakPassword';
  }
  if (m.includes('rate limit') || m.includes('for security purposes') || m.includes('too many')) {
    return 'rateLimited';
  }
  return 'generic';
}
