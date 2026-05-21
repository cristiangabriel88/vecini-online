import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import type { Membership, UserProfile } from '@/shared/types/domain';

interface AuthState {
  session: Session | null;
  profile: UserProfile | null;
  memberships: Membership[];
  loading: boolean;
  demo: boolean;
  init: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  enterDemo: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  memberships: [],
  loading: true,
  demo: false,

  init: async () => {
    if (!isSupabaseConfigured) {
      set({ loading: false });
      return;
    }
    const { data } = await supabase.auth.getSession();
    set({ session: data.session, loading: false });
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session });
      if (!session) set({ profile: null, memberships: [] });
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

  signOut: async () => {
    if (isSupabaseConfigured) await supabase.auth.signOut();
    set({ session: null, profile: null, memberships: [], demo: false });
  },

  enterDemo: () => set({ demo: true, loading: false }),
}));
