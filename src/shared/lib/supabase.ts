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
    },
  },
);

export { isSupabaseConfigured };
