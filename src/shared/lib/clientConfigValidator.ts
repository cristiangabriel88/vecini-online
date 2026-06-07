// Client-side startup config validator (T282).
//
// Validates VITE_* environment variables at app boot so misconfiguration
// surfaces in the browser console rather than as a silent partial failure.
// Called once from main.tsx after module initialisation.
//
// Design constraints:
//   - Never prints a variable's value.
//   - In demo mode (Supabase creds absent) the validator is a no-op.
//   - All validation logic is pure so it is directly unit-testable.
//   - This list is the single auditable source for client-side required vars.

export interface ClientConfigIssue {
  name: string;
  reason: 'missing' | 'malformed';
  hint: string;
}

export interface ValidateClientResult {
  /** True when the app is running in intentional offline/demo mode. */
  demo: boolean;
  issues: ClientConfigIssue[];
}

type ClientRequirement =
  | 'live'      // required when Supabase creds are present
  | 'optional'; // shape-checked only if present

interface ClientVarSpec {
  name: string;
  requirement: ClientRequirement;
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

/**
 * All client-side environment variables that the validator checks.
 */
export const CLIENT_VARS: readonly ClientVarSpec[] = [
  {
    name: 'VITE_SUPABASE_URL',
    requirement: 'live',
    validate: isHttpsUrl,
  },
  {
    name: 'VITE_SUPABASE_ANON_KEY',
    requirement: 'live',
    validate: v => (v.startsWith('eyJ') ? null : 'expected JWT format starting with eyJ'),
  },
  {
    name: 'VITE_APP_URL',
    requirement: 'optional',
    validate: isHttpsUrl,
  },
  {
    name: 'VITE_RESIDENT_APP_URL',
    requirement: 'optional',
    validate: isHttpsUrl,
  },
  {
    name: 'VITE_PLATFORM_URL',
    requirement: 'optional',
    validate: isHttpsUrl,
  },
  {
    name: 'VITE_APP_STAGE',
    requirement: 'optional',
    validate: v => (['prod', 'dev', 'demo'].includes(v) ? null : 'must be one of: prod, dev, demo'),
  },
  {
    name: 'VITE_DEFAULT_LOCALE',
    requirement: 'optional',
    validate: v => (['ro', 'en'].includes(v) ? null : 'must be one of: ro, en'),
  },
  {
    name: 'VITE_SECURITY_ENFORCEMENT',
    requirement: 'optional',
    validate: v => (['strict', 'relaxed'].includes(v) ? null : 'must be one of: strict, relaxed'),
  },
];

/**
 * Validates client-side VITE_* variables for presence and shape.
 *
 * Returns `{ demo: true, issues: [] }` when Supabase creds are absent --
 * the intentional offline/demo posture where many vars are expected unset.
 *
 * Pass a custom `env` object (keyed by var name) for unit testing.
 */
export function validateClientConfig(
  env: Record<string, string | undefined>,
): ValidateClientResult {
  const supabaseUrl = env.VITE_SUPABASE_URL;
  const anonKey = env.VITE_SUPABASE_ANON_KEY;
  const supabaseConfigured = Boolean(supabaseUrl && anonKey);

  if (!supabaseConfigured) {
    return { demo: true, issues: [] };
  }

  const issues: ClientConfigIssue[] = [];

  for (const spec of CLIENT_VARS) {
    const value = env[spec.name];

    if (!value) {
      if (spec.requirement === 'live') {
        issues.push({ name: spec.name, reason: 'missing', hint: 'variable is not set' });
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
 * Validates client config at app boot and logs issues to the browser console.
 * Never throws, never prints values. Safe to call at module initialisation.
 */
export function assertClientConfig(): void {
  const env: Record<string, string | undefined> = {};
  for (const spec of CLIENT_VARS) {
    env[spec.name] = import.meta.env[spec.name] as string | undefined;
  }

  const { demo, issues } = validateClientConfig(env);
  if (demo || issues.length === 0) return;

  for (const issue of issues) {
    console.error(`[config] ${issue.reason}: ${issue.name} -- ${issue.hint}`);
  }
}
