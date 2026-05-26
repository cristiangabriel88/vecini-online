/**
 * Password strength policy and known-breach rejection (T03).
 *
 * Pure, dependency-free so it unit-tests in isolation and runs identically in
 * demo and live paths. Sign-up enforces this policy before a password ever
 * reaches the network; sign-in keeps the looser `authLogic.validatePassword`
 * gate so existing residents whose password predates the policy can still log
 * in (the policy is raised only at the point a password is *set*).
 *
 * "Known-breach rejection" is done offline against a curated blocklist of the
 * most-commonly-breached passwords (below). This keeps the check deterministic,
 * private (the password never leaves the device) and fully exercisable in demo
 * mode and E2E. A future online augmentation (HaveIBeenPwned k-anonymity range
 * query, which never sends the full password either) is noted in DECISIONS.md
 * but deliberately not required, so the app stays offline-runnable.
 */

/** Minimum length required when *setting* a password (sign-up / reset). */
export const MIN_POLICY_LENGTH = 10;
/** Upper bound: bcrypt (and Supabase Auth) only consider the first 72 bytes. */
export const MAX_POLICY_LENGTH = 72;

/**
 * The most-commonly-breached / trivially-guessable passwords. Compared after
 * normalising (lower-cased, with separators stripped) so trivial variations are
 * caught too. Kept focused rather than exhaustive; it covers the passwords that
 * dominate every credential dump plus the obvious Romanian and product-specific
 * guesses a resident might reach for.
 */
const COMMON_PASSWORDS = new Set<string>([
  'password', 'passw0rd', 'password1', 'password123', 'passwords',
  '123456', '1234567', '12345678', '123456789', '1234567890', '12345', '111111',
  '000000', '654321', '666666', '121212', '123123', '112233', 'abc123', 'abcd1234',
  'qwerty', 'qwertyuiop', 'qwerty123', 'asdfgh', 'asdfghjkl', 'zxcvbnm', '1q2w3e4r',
  'qazwsx', 'iloveyou', 'admin', 'administrator', 'root', 'letmein', 'welcome',
  'welcome1', 'login', 'master', 'dragon', 'monkey', 'sunshine', 'princess',
  'football', 'baseball', 'superman', 'trustno1', 'starwars', 'whatever', 'changeme',
  'secret', 'access', 'shadow', 'michael', 'jordan', 'hello123', 'freedom',
  // Romanian-leaning and product-specific guesses.
  'parola', 'parola123', 'parolamea', 'asociatie', 'asociatia', 'administrator1',
  'romania', 'bucuresti', 'vecini', 'vecinionline', 'vecinionline123', 'bloc',
]);

/** Lower-case and strip common separators so "P@ss-word_1" reduces sensibly. */
function normalize(password: string): string {
  return password.toLowerCase().replace(/[\s._\-@]/g, '');
}

/** How many distinct character classes a password draws on (0–4). */
export function characterClasses(password: string): number {
  let n = 0;
  if (/[a-z]/.test(password)) n++;
  if (/[A-Z]/.test(password)) n++;
  if (/[0-9]/.test(password)) n++;
  if (/[^a-zA-Z0-9]/.test(password)) n++;
  return n;
}

/** Whether the password is on the breached/common blocklist (after normalising). */
export function isBreachedPassword(password: string): boolean {
  const n = normalize(password);
  if (COMMON_PASSWORDS.has(n)) return true;
  // Catch a common pattern: a blocklisted base with a few trailing digits.
  const base = n.replace(/\d+$/, '');
  return base.length >= 4 && COMMON_PASSWORDS.has(base);
}

export type PasswordIssueCode =
  | 'tooShort'
  | 'tooLong'
  | 'noVariety'
  | 'breached'
  | 'containsEmail';

/** Strength buckets, low → high. Maps to the meter and an i18n label key. */
export type PasswordStrength = 'weak' | 'fair' | 'good' | 'strong';

export interface PasswordAssessment {
  /** True only when there are no blocking issues (safe to submit). */
  ok: boolean;
  /** Blocking reasons, in priority order, as stable i18n-friendly codes. */
  issues: PasswordIssueCode[];
  /** Coarse strength bucket for the UI meter (independent of `ok`). */
  strength: PasswordStrength;
  /** 0–4 score backing `strength`, useful for the meter width. */
  score: 0 | 1 | 2 | 3 | 4;
}

/** The local-part of an email, lower-cased, or '' when not a usable email. */
function emailLocalPart(email: string | undefined): string {
  if (!email) return '';
  const at = email.indexOf('@');
  return (at > 0 ? email.slice(0, at) : email).trim().toLowerCase();
}

function strengthFromScore(score: number): PasswordStrength {
  if (score <= 1) return 'weak';
  if (score === 2) return 'fair';
  if (score === 3) return 'good';
  return 'strong';
}

/**
 * Assess a candidate password against the policy. `email` (optional) lets us
 * reject passwords that merely echo the account's email local-part. The result
 * carries both the blocking `issues` and an advisory `strength` for the meter.
 */
export function evaluatePassword(password: string, email?: string): PasswordAssessment {
  const issues: PasswordIssueCode[] = [];

  if (password.length < MIN_POLICY_LENGTH) issues.push('tooShort');
  if (password.length > MAX_POLICY_LENGTH) issues.push('tooLong');
  if (characterClasses(password) < 2) issues.push('noVariety');
  if (isBreachedPassword(password)) issues.push('breached');

  const local = emailLocalPart(email);
  if (local.length >= 3 && normalize(password).includes(local)) issues.push('containsEmail');

  // Advisory strength score (does not gate submission on its own).
  let score = 0;
  if (password.length >= MIN_POLICY_LENGTH) score++;
  if (password.length >= 14) score++;
  if (characterClasses(password) >= 3) score++;
  if (characterClasses(password) >= 4 || password.length >= 18) score++;
  if (issues.includes('breached') || issues.includes('containsEmail')) score = 0;
  const clamped = Math.max(0, Math.min(4, score)) as 0 | 1 | 2 | 3 | 4;

  return {
    ok: issues.length === 0,
    issues,
    strength: strengthFromScore(clamped),
    score: clamped,
  };
}
