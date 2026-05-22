import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { env } from '@/shared/lib/env';
import type { Membership, UserProfile } from '@/shared/types/domain';

/** Where Supabase sends the resident after they click the password-reset link. */
const RESET_REDIRECT = `${env.appUrl}/reset-parola`;

interface AuthResult {
  error: string | null;
}

interface SignUpResult extends AuthResult {
  /** True when the account was created but awaits email confirmation (no session). */
  needsVerification: boolean;
}

interface AuthState {
  session: Session | null;
  profile: UserProfile | null;
  memberships: Membership[];
  loading: boolean;
  demo: boolean;
  /** Set while the resident is in a password-recovery session (from the email link). */
  recovery: boolean;
  init: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string) => Promise<SignUpResult>;
  resendVerification: (email: string) => Promise<AuthResult>;
  requestPasswordReset: (email: string) => Promise<AuthResult>;
  updatePassword: (password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  enterDemo: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  memberships: [],
  loading: true,
  demo: false,
  recovery: false,

  init: async () => {
    if (!isSupabaseConfigured) {
      set({ loading: false });
      return;
    }
    const { data } = await supabase.auth.getSession();
    set({ session: data.session, loading: false });
    supabase.auth.onAuthStateChange((event, session) => {
      set({ session });
      if (event === 'PASSWORD_RECOVERY') set({ recovery: true });
      if (!session) set({ profile: null, memberships: [], recovery: false });
    });
  },

  signIn: async (email, password) => {
    if (!isSupabaseConfigured) {
      get().enterDemo();
      return { error: null };
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? error.message : null };
  },

  signUp: async (email, password) => {
    if (!isSupabaseConfigured) {
      get().enterDemo();
      return { error: null, needsVerification: false };
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: env.appUrl },
    });
    if (error) return { error: error.message, needsVerification: false };
    // With email confirmation enabled, signUp returns a user but no session until
    // the resident clicks the verification link. Treat the absence of a session
    // as "check your email".
    return { error: null, needsVerification: !data.session };
  },

  resendVerification: async (email) => {
    if (!isSupabaseConfigured) return { error: null };
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: env.appUrl },
    });
    return { error: error ? error.message : null };
  },

  requestPasswordReset: async (email) => {
    if (!isSupabaseConfigured) return { error: null };
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: RESET_REDIRECT,
    });
    return { error: error ? error.message : null };
  },

  updatePassword: async (password) => {
    if (!isSupabaseConfigured) {
      set({ recovery: false });
      return { error: null };
    }
    const { error } = await supabase.auth.updateUser({ password });
    if (!error) set({ recovery: false });
    return { error: error ? error.message : null };
  },

  signOut: async () => {
    if (isSupabaseConfigured) await supabase.auth.signOut();
    set({ session: null, profile: null, memberships: [], demo: false, recovery: false });
  },

  enterDemo: () => set({ demo: true, loading: false }),
}));
