import { parseSecurityEnforcement, type SecurityEnforcement } from '@/features/auth/mfaLogic';
import { resolveSupabaseUrl } from './supabaseUrl';
import { selectedDeploy, getProfile, type Deploy } from '@/config/app.config';

/** Deployment stage. PROD = cloud Supabase + Resend. DEV = local Pi Supabase.
 *  DEMO = frontend-only, no backend, offline seed.
 *  The concrete values for each stage live in the single config file
 *  `src/config/app.config.ts`; this module only binds them to the browser
 *  environment and applies typed resolution. */
export type AppStage = Deploy;

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
  /** Resolved deployment stage. Reads `VITE_APP_STAGE`; defaults to `prod`
   *  when Supabase is configured and `demo` when it is not, so existing deploys
   *  are unaffected by the new variable. */
  appStage: AppStage;
  /** Telegram bot username (without @) for building deep links. Reads
   *  `VITE_TELEGRAM_BOT_USERNAME`; empty string when unset (deep-link UI
   *  shows placeholder text instead of a live URL). */
  telegramBotUsername: string;
}

// The active deploy target chosen by the switch in app.config.ts (or a
// build-time VITE_APP_STAGE override). Null when nothing was selected, in which
// case the stage is derived below from whether Supabase creds are present, so a
// creds-less build still falls back to demo exactly as before.
const selected = selectedDeploy(import.meta.env.VITE_APP_STAGE as string | undefined);

// Profile providing the committed default VALUES. When no stage was selected we
// read prod's defaults; the final stage is still resolved cred-aware below, so a
// creds-less unselected build resolves to demo while ignoring these values.
const profile = getProfile(selected ?? 'prod');

/** An env var wins when set and non-blank; otherwise the profile default. */
function pick(envValue: string | undefined, fallback: string): string {
  const v = envValue?.trim();
  return v ? v : fallback;
}

const rawUrl = pick(import.meta.env.VITE_SUPABASE_URL, profile.supabaseUrl);
const rawKey = pick(import.meta.env.VITE_SUPABASE_ANON_KEY, profile.supabaseAnonKey);

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

/**
 * Resolve the deployment stage from the raw env var and whether Supabase is
 * configured. Pure so it can be unit-tested without `import.meta.env`.
 * Invalid values fall back to the same default as an absent value.
 */
export function resolveAppStage(
  rawStage: string | undefined,
  supabaseConfigured: boolean,
): AppStage {
  const s = rawStage?.trim();
  if (s === 'prod' || s === 'dev' || s === 'demo') return s;
  return supabaseConfigured ? 'prod' : 'demo';
}

const appUrl =
  pick(import.meta.env.VITE_APP_URL, profile.appUrl) ||
  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173');

/** True when Supabase credentials are present. In their absence the app runs
 *  in a read-only demo mode so the UI is still inspectable without a backend. */
export const isSupabaseConfigured = Boolean(rawUrl && rawKey);

/** Resolved deployment stage. An explicit selection (env var or the
 *  app.config.ts switch) is honoured as-is; otherwise it defaults to prod when
 *  Supabase is configured and demo when it is not, preserving prior behaviour. */
export const appStage: AppStage = resolveAppStage(selected ?? undefined, isSupabaseConfigured);

export const env: ClientEnv = {
  supabaseUrl: resolveSupabaseUrl(
    rawUrl,
    appStage,
    typeof window !== 'undefined' ? window.location.hostname : undefined,
  ),
  supabaseAnonKey: rawKey,
  defaultLocale: pick(import.meta.env.VITE_DEFAULT_LOCALE, profile.defaultLocale),
  appUrl,
  residentAppUrl: resolveResidentAppUrl(
    pick(import.meta.env.VITE_RESIDENT_APP_URL, profile.residentAppUrl),
    appUrl,
  ),
  securityEnforcement: parseSecurityEnforcement(
    pick(import.meta.env.VITE_SECURITY_ENFORCEMENT, profile.securityEnforcement),
  ),
  platformUrl: pick(import.meta.env.VITE_PLATFORM_URL, profile.platformUrl) || null,
  appStage,
  telegramBotUsername: pick(import.meta.env.VITE_TELEGRAM_BOT_USERNAME, profile.telegramBotUsername),
};

/** Returns the current deployment stage. */
export function getStage(): AppStage {
  return env.appStage;
}

/** True when running as a production cloud deployment. */
export function isProd(): boolean {
  return env.appStage === 'prod';
}

/** True when running on a self-hosted Pi / DEV instance. */
export function isDev(): boolean {
  return env.appStage === 'dev';
}

/** True when running in frontend-only offline demo mode. */
export function isDemo(): boolean {
  return env.appStage === 'demo';
}
