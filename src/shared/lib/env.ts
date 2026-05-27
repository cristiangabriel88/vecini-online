import { parseSecurityEnforcement, type SecurityEnforcement } from '@/features/auth/mfaLogic';

interface ClientEnv {
  supabaseUrl: string;
  supabaseAnonKey: string;
  defaultLocale: string;
  appUrl: string;
  /**
   * Base URL of the resident/admin app. On the superadmin console (its own
   * subdomain) `appUrl` resolves to the platform origin, so onboarding links
   * minted there must target this resident origin instead (T133). Reads
   * `VITE_RESIDENT_APP_URL`, falling back to `appUrl` so the single-origin
   * dev/demo build is unchanged.
   */
  residentAppUrl: string;
  /** 2FA enforcement posture: `strict` (default/production) or `relaxed` (self-hosted/dev). */
  securityEnforcement: SecurityEnforcement;
  /**
   * URL of the dedicated platform (superadmin) console on its own subdomain.
   * When set and the session is a platform superadmin, the resident app performs
   * a full-page cross-origin redirect here instead of rendering the in-app
   * console preview (T135). Reads `VITE_PLATFORM_URL`; null when unset so the
   * single-origin dev/demo build is unchanged.
   */
  platformUrl: string | null;
}

const rawUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

/**
 * Resolve the resident-app base URL for links built anywhere (notably the
 * platform console). Prefers an explicit resident origin, else the app's own.
 * Pure so the fallback chain can be unit-tested without `import.meta.env`.
 */
export function resolveResidentAppUrl(
  residentUrl: string | undefined,
  appUrl: string,
): string {
  const trimmed = residentUrl?.trim();
  return trimmed ? trimmed : appUrl;
}

const appUrl = import.meta.env.VITE_APP_URL ?? window.location.origin;

export const env: ClientEnv = {
  supabaseUrl: rawUrl,
  supabaseAnonKey: rawKey,
  defaultLocale: import.meta.env.VITE_DEFAULT_LOCALE ?? 'ro',
  appUrl,
  residentAppUrl: resolveResidentAppUrl(import.meta.env.VITE_RESIDENT_APP_URL, appUrl),
  securityEnforcement: parseSecurityEnforcement(import.meta.env.VITE_SECURITY_ENFORCEMENT),
  platformUrl: (import.meta.env.VITE_PLATFORM_URL as string | undefined)?.trim() || null,
};

/** True when Supabase credentials are present. In their absence the app runs
 *  in a read-only demo mode so the UI is still inspectable without a backend. */
export const isSupabaseConfigured = Boolean(rawUrl && rawKey);
