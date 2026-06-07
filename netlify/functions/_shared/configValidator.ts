// Server-side startup config validator (T282).
//
// Checks required environment variables for presence and basic shape at
// function cold-start so misconfiguration surfaces immediately in logs
// rather than as a silent partial failure mid-request.
//
// Design constraints:
//   - Never prints a variable's value -- only the variable name and shape hint.
//   - In demo mode (Supabase creds absent) the validator is a no-op because
//     the intentional offline posture means many vars are expected to be unset.
//   - All validation logic is pure (takes an env object, returns issues) so
//     it is directly testable without side effects.
//   - This is the single auditable list of all required server-side variables.

export interface ConfigIssue {
  /** Environment variable name. */
  name: string;
  /** 'missing' = var is absent; 'malformed' = present but invalid shape. */
  reason: 'missing' | 'malformed';
  /** Non-secret description of what is wrong or expected. */
  hint: string;
}

export interface ValidateServerResult {
  /** True when Supabase is not configured (intentional offline/demo posture). */
  demo: boolean;
  issues: ConfigIssue[];
}

type Requirement =
  | 'live'      // required whenever Supabase creds are present (live mode)
  | 'resend'    // required when MAIL_MODE=resend (or MAIL_MODE unset, which defaults to resend)
  | 'telegram'  // required when TELEGRAM_BOT_TOKEN is set
  | 'optional'; // shape-checked only if present; never flagged as missing

interface VarSpec {
  name: string;
  requirement: Requirement;
  /** Returns a hint string when invalid, null when ok. */
  validate?: (value: string) => string | null;
}

function isHttpsUrl(v: string): string | null {
  try {
    const u = new URL(v);
    if (u.protocol === 'https:' || u.protocol === 'http:') return null;
    return 'must be an http:// or https:// URL';
  } catch {
    return 'must be a valid URL';
  }
}

function minLength(n: number): (v: string) => string | null {
  return v => (v.length >= n ? null : `must be at least ${n} characters`);
}

/**
 * All server-side environment variables that the validator checks.
 * This list is the single auditable source for what the server needs.
 */
export const SERVER_VARS: readonly VarSpec[] = [
  {
    name: 'VITE_SUPABASE_URL',
    requirement: 'live',
    validate: isHttpsUrl,
  },
  {
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    requirement: 'live',
    validate: v => (v.startsWith('eyJ') ? null : 'expected JWT format starting with eyJ'),
  },
  {
    name: 'AUDIT_HMAC_SECRET',
    requirement: 'live',
    validate: minLength(32),
  },
  {
    name: 'APP_URL',
    requirement: 'live',
    validate: isHttpsUrl,
  },
  {
    name: 'RESEND_API_KEY',
    requirement: 'resend',
    validate: v => (v.startsWith('re_') ? null : 'expected format starting with re_'),
  },
  {
    name: 'RESEND_FROM_EMAIL',
    requirement: 'resend',
    validate: v => (v.includes('@') ? null : 'must be a valid email address'),
  },
  {
    name: 'RESEND_WEBHOOK_SECRET',
    requirement: 'resend',
    validate: minLength(32),
  },
  {
    name: 'MAIL_MODE',
    requirement: 'optional',
    validate: v => (['resend', 'log', 'disabled'].includes(v) ? null : 'must be one of: resend, log, disabled'),
  },
  {
    name: 'TELEGRAM_WEBHOOK_SECRET',
    requirement: 'telegram',
    validate: minLength(32),
  },
  {
    name: 'TELEGRAM_BOT_TOKEN',
    requirement: 'optional',
    validate: v => (/^\d+:/.test(v) ? null : 'expected format <numeric-id>:<token>'),
  },
  {
    name: 'VITE_TELEGRAM_BOT_USERNAME',
    requirement: 'optional',
    validate: v => (v.length > 0 ? null : 'must be non-empty when set'),
  },
];

/**
 * Validates all server-side environment variables for presence and shape.
 *
 * Returns `{ demo: true, issues: [] }` when Supabase creds are absent because
 * that indicates an intentional offline/demo deployment where many vars are
 * expected to be unset. No issues are surfaced in that posture.
 *
 * Pass a custom `env` object (subset of `process.env`) for unit testing.
 */
export function validateServerConfig(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): ValidateServerResult {
  const supabaseUrl = env.VITE_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseConfigured = Boolean(supabaseUrl && serviceKey);

  if (!supabaseConfigured) {
    return { demo: true, issues: [] };
  }

  const mailMode = env.MAIL_MODE ?? 'resend';
  const telegramEnabled = Boolean(env.TELEGRAM_BOT_TOKEN);

  const issues: ConfigIssue[] = [];

  for (const spec of SERVER_VARS) {
    if (spec.requirement === 'resend' && mailMode !== 'resend') continue;
    if (spec.requirement === 'telegram' && !telegramEnabled) continue;

    const value = env[spec.name];

    if (!value) {
      if (spec.requirement !== 'optional') {
        issues.push({
          name: spec.name,
          reason: 'missing',
          hint: 'variable is not set',
        });
      }
      continue;
    }

    if (spec.validate) {
      const hint = spec.validate(value);
      if (hint) {
        issues.push({ name: spec.name, reason: 'malformed', hint });
      }
    }
  }

  return { demo: false, issues };
}

/**
 * Validates server config and logs a clear warning for each issue to stderr.
 * Safe to call at module cold-start -- never throws, never prints values.
 *
 * Pass a custom `env` for testing; defaults to `process.env`.
 */
export function assertServerConfig(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): void {
  const { demo, issues } = validateServerConfig(env);
  if (demo || issues.length === 0) return;

  for (const issue of issues) {
    console.error(`[config] ${issue.reason}: ${issue.name} -- ${issue.hint}`);
  }
}
