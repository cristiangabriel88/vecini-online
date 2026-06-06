/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_DEFAULT_LOCALE?: string;
  readonly VITE_APP_URL?: string;
  readonly VITE_RESIDENT_APP_URL?: string;
  readonly VITE_APP_STAGE?: 'prod' | 'dev' | 'demo';
  /** Build release identifier injected at build time (git short SHA or CI commit ref). */
  readonly VITE_APP_RELEASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
