/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

// Build-time overrides for the deploy settings whose committed defaults live in
// src/config/app.config.ts. Any of these, when set, wins over the profile value
// (see the precedence note in that file). They are optional precisely because
// the profile supplies the default.
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_DEFAULT_LOCALE?: string;
  readonly VITE_APP_URL?: string;
  readonly VITE_RESIDENT_APP_URL?: string;
  readonly VITE_PLATFORM_URL?: string;
  readonly VITE_SECURITY_ENFORCEMENT?: 'strict' | 'relaxed';
  readonly VITE_TELEGRAM_BOT_USERNAME?: string;
  readonly VITE_STORAGE_MODE?: 'supabase' | 'local' | 'none';
  readonly VITE_APP_STAGE?: 'prod' | 'dev' | 'demo';
  /** Build release identifier injected at build time (git short SHA or CI commit ref). */
  readonly VITE_APP_RELEASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
