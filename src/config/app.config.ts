// ============================================================================
// vecini.online -- application properties (the single deploy config file)
// ============================================================================
// This is the ONE place to change non-secret deployment settings, the way a
// Java app uses application.properties. Three profiles (prod / dev / demo) hold
// every public value, and a single switch (ACTIVE_OVERRIDE, just below) picks
// which profile a build uses.
//
//   Want a dev build?  ->  set `ACTIVE_OVERRIDE = 'dev'` below and rebuild.
//   Want prod again?   ->  set it back to `null` (or 'prod') and rebuild.
//
// The switch governs BOTH the runtime bundle and the build tooling
// (service-worker mode, sourcemaps, CSP) because vite.config.ts resolves the
// stage through the same `resolveDeploy()` exported here.
//
// Precedence, applied per field (highest wins):
//   1. A VITE_* environment variable set at build time   (Netlify / CI / .env)
//   2. The value in the selected profile below
//   3. A safe built-in fallback (window origin, etc.)
// So CI/Netlify deploys that already set VITE_APP_STAGE / VITE_SUPABASE_URL
// keep working untouched; the profile values are the committed defaults used
// when those env vars are absent.
//
// ----------------------------------------------------------------------------
// SECRETS DO NOT LIVE HERE.
// ----------------------------------------------------------------------------
// The Supabase SERVICE-ROLE key, Telegram bot token, Resend API key and webhook
// signing secrets grant privileged / server-side access. They must stay as
// deploy-time environment variables read by the Netlify functions
// (process.env.*), never committed to this file. Only public, browser-safe
// values belong here. The Supabase ANON key is public by design -- it ships in
// the JS bundle and is gated by row-level security -- so it may be pasted into a
// profile, but it is left blank for prod so the real key is supplied at deploy
// time via VITE_SUPABASE_ANON_KEY.
// ============================================================================

import { PRODUCTION_SUPABASE_URL } from '../shared/lib/supabaseUrl';

/** Deployment target. prod = cloud Supabase + Resend. dev = self-hosted Pi
 *  Supabase. demo = frontend-only offline seed, no backend. */
export type Deploy = 'prod' | 'dev' | 'demo';

// ----------------------------------------------------------------------------
//  THE SWITCH -- change this one line to pick the default build target.
//  Leave `null` to default to 'prod'. A VITE_APP_STAGE env var set at build
//  time always wins over this, so Netlify/CI deploys are unaffected.
// ----------------------------------------------------------------------------
const ACTIVE_OVERRIDE: Deploy | null = null;

/** Fallback when neither an env stage nor ACTIVE_OVERRIDE is set. */
const DEFAULT_DEPLOY: Deploy = 'prod';

/** All public, browser-safe settings for one deployment profile. */
export interface DeployProfile {
  /** Supabase project URL. Empty in demo (no backend). */
  supabaseUrl: string;
  /** Supabase anon (public) key. Blank for prod -> supply via
   *  VITE_SUPABASE_ANON_KEY at deploy time (or paste the public key here). */
  supabaseAnonKey: string;
  /** Base URL of this (resident/admin) app, no trailing slash. */
  appUrl: string;
  /** Resident-app origin for onboarding links minted on the platform console.
   *  Blank falls back to appUrl. */
  residentAppUrl: string;
  /** Superadmin console origin on its own subdomain, or '' for the
   *  single-origin dev/demo build. */
  platformUrl: string;
  /** Default UI locale. */
  defaultLocale: 'ro' | 'en';
  /** In-app 2FA posture for privileged roles. strict = production. */
  securityEnforcement: 'strict' | 'relaxed';
  /** Telegram bot username (without @) for deep links, or '' when none. */
  telegramBotUsername: string;
}

/** The committed defaults for every deployment target. */
export const PROFILES: Record<Deploy, DeployProfile> = {
  prod: {
    supabaseUrl: PRODUCTION_SUPABASE_URL,
    supabaseAnonKey: '', // public anon key -> set VITE_SUPABASE_ANON_KEY at deploy
    appUrl: 'https://vecini.online',
    residentAppUrl: 'https://vecini.online',
    platformUrl: 'https://hub.vecini.online', // superadmin console subdomain
    defaultLocale: 'ro',
    securityEnforcement: 'strict',
    telegramBotUsername: '',
  },
  dev: {
    supabaseUrl: 'http://localhost:54321',
    supabaseAnonKey: 'local-anon-key-placeholder',
    appUrl: 'http://localhost:5173',
    residentAppUrl: 'http://localhost:5173',
    platformUrl: '',
    defaultLocale: 'ro',
    securityEnforcement: 'relaxed',
    telegramBotUsername: '',
  },
  demo: {
    supabaseUrl: '', // no backend -> the app runs the offline seeded demo
    supabaseAnonKey: '',
    appUrl: '', // falls back to the runtime window origin
    residentAppUrl: '',
    platformUrl: '',
    defaultLocale: 'ro',
    securityEnforcement: 'relaxed',
    telegramBotUsername: '',
  },
};

/**
 * The explicitly selected deploy target: a build-time VITE_APP_STAGE env value
 * if valid, else the ACTIVE_OVERRIDE switch, else `null` (nothing chosen).
 * Pure, so the browser (env.ts) and the Node build (vite.config.ts) agree.
 */
export function selectedDeploy(envStage?: string | null): Deploy | null {
  const s = envStage?.trim();
  if (s === 'prod' || s === 'dev' || s === 'demo') return s;
  return ACTIVE_OVERRIDE;
}

/**
 * Resolve a concrete deploy target, applying DEFAULT_DEPLOY when nothing is
 * selected. Used by the build tooling (vite.config.ts) which has no notion of
 * runtime Supabase-cred presence; the browser uses the cred-aware resolver in
 * env.ts so a creds-less build still falls back to demo.
 */
export function resolveDeploy(envStage?: string | null): Deploy {
  return selectedDeploy(envStage) ?? DEFAULT_DEPLOY;
}

/** The profile (committed default values) for a deploy target. */
export function getProfile(deploy: Deploy): DeployProfile {
  return PROFILES[deploy];
}
