import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env, isSupabaseConfigured } from './env';

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
      // PKCE is the more secure browser flow: the authorization code is bound to
      // a one-time verifier this client holds, so an intercepted code (e.g. from
      // an email link) cannot be exchanged for a session elsewhere (T03).
      flowType: 'pkce',
    },
  },
);

export { isSupabaseConfigured };
