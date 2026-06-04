import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env, isSupabaseConfigured } from './env';
import { rememberStorage } from '@/features/auth/sessionPersistence';

/**
 * Singleton Supabase client. When credentials are absent (e.g. local preview
 * without a backend) we still construct a client against a placeholder URL so
 * imports don't crash; callers should guard network use with
 * `isSupabaseConfigured`.
 */
export const supabase: SupabaseClient = createClient(
  env.supabaseUrl || 'https://placeholder.supabase.co',
  env.supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // Route the session to sessionStorage by default (cleared on browser close)
      // and to localStorage only when the resident chose "remember me" (T: secure
      // session defaults). See sessionPersistence.ts.
      storage: rememberStorage,
      // PKCE is the more secure browser flow: the authorization code is bound to
      // a one-time verifier this client holds, so an intercepted code (e.g. from
      // an email link) cannot be exchanged for a session elsewhere (T03).
      flowType: 'pkce',
    },
  },
);

// Pi DEV runs without the Realtime service. Disconnect immediately so the SDK
// does not retry the WebSocket every few seconds and flood the console.
if (import.meta.env.VITE_APP_STAGE === 'dev') {
  supabase.realtime.disconnect();
}

export { isSupabaseConfigured };
