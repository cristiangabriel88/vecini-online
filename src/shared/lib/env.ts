interface ClientEnv {
  supabaseUrl: string;
  supabaseAnonKey: string;
  defaultLocale: string;
  appUrl: string;
}

const rawUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

export const env: ClientEnv = {
  supabaseUrl: rawUrl,
  supabaseAnonKey: rawKey,
  defaultLocale: import.meta.env.VITE_DEFAULT_LOCALE ?? 'ro',
  appUrl: import.meta.env.VITE_APP_URL ?? window.location.origin,
};

/** True when Supabase credentials are present. In their absence the app runs
 *  in a read-only demo mode so the UI is still inspectable without a backend. */
export const isSupabaseConfigured = Boolean(rawUrl && rawKey);
