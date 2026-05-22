import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { env } from '@/shared/lib/env';
import type { Membership, NotificationPreferences, Role, UserProfile } from '@/shared/types/domain';
import { pickActiveAsociatieId, roleFor, sortByPrivilege } from '@/features/auth/hydrationLogic';
import { useSecurityStore } from './securityStore';

/** Where Supabase sends the resident after they click the password-reset link. */
const RESET_REDIRECT = `${env.appUrl}/reset-parola`;

interface AuthResult {
  error: string | null;
}

interface SignInResult extends AuthResult {
  /** Remaining lockout in ms when sign-in is throttled (0 otherwise). */
  lockedMs: number;
}

interface SignUpResult extends AuthResult {
  /** True when the account was created but awaits email confirmation (no session). */
  needsVerification: boolean;
}

interface AuthState {
  session: Session | null;
  profile: UserProfile | null;
  memberships: Membership[];
  /** The asociație whose data the app is currently scoped to (null = none yet). */
  currentAsociatieId: string | null;
  loading: boolean;
  demo: boolean;
  /** Set while the resident is in a password-recovery session (from the email link). */
  recovery: boolean;
  init: () => Promise<void>;
  /** Load profile + active memberships for the current session (live path). */
  hydrate: () => Promise<void>;
  /** The signed-in user's role in the active asociație, or null. */
  activeRole: () => Role | null;
  /** Switch the active asociație (must be one the user is a member of). */
  setActiveAsociatie: (asociatieId: string) => void;
  signIn: (email: string, password: string) => Promise<SignInResult>;
  signUp: (email: string, password: string) => Promise<SignUpResult>;
  resendVerification: (email: string) => Promise<AuthResult>;
  requestPasswordReset: (email: string) => Promise<AuthResult>;
  updatePassword: (password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  /** Revoke every session for this account everywhere (global sign-out). */
  signOutEverywhere: () => Promise<void>;
  enterDemo: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  memberships: [],
  currentAsociatieId: null,
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
    if (data.session) await get().hydrate();
    supabase.auth.onAuthStateChange((event, session) => {
      set({ session });
      if (event === 'PASSWORD_RECOVERY') set({ recovery: true });
      // The library refreshes the access token silently before it expires; a
      // failed refresh ends in SIGNED_OUT, which clears the derived state below.
      if (!session) {
        set({ profile: null, memberships: [], currentAsociatieId: null, recovery: false });
      } else if (event === 'SIGNED_IN') {
        void get().hydrate();
      }
    });
  },

  hydrate: async () => {
    if (!isSupabaseConfigured) return;
    const userId = get().session?.user?.id;
    if (!userId) return;
    // Both reads run under RLS: a user sees only their own profile row and only
    // memberships scoped to them. The demo seed stays the offline fallback.
    const [{ data: profileRow }, { data: membershipRows }] = await Promise.all([
      supabase.from('users').select('*').eq('id', userId).maybeSingle(),
      supabase.from('memberships').select('*').eq('user_id', userId).is('ended_at', null),
    ]);
    const memberships = sortByPrivilege((membershipRows ?? []) as Membership[]);
    const currentAsociatieId = pickActiveAsociatieId(memberships, get().currentAsociatieId);
    set({
      profile: profileRow
        ? {
            ...(profileRow as UserProfile),
            notification_preferences:
              (profileRow as UserProfile).notification_preferences as NotificationPreferences,
          }
        : get().profile,
      memberships,
      currentAsociatieId,
    });
  },

  activeRole: () => roleFor(get().memberships, get().currentAsociatieId),

  setActiveAsociatie: (asociatieId) => {
    const isMember = get().memberships.some(
      (m) => m.asociatie_id === asociatieId && m.ended_at === null,
    );
    if (isMember) set({ currentAsociatieId: asociatieId });
  },

  signIn: async (email, password) => {
    const sec = useSecurityStore.getState();
    if (!isSupabaseConfigured) {
      get().enterDemo();
      return { error: null, lockedMs: 0 };
    }
    // Refuse before hitting the network while a lockout is in force.
    const preLock = sec.lockRemainingMs(email);
    if (preLock > 0) {
      sec.log('loginLocked', email);
      return { error: 'locked', lockedMs: preLock };
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const lockedMs = sec.registerFailure(email);
      sec.log(lockedMs > 0 ? 'loginLocked' : 'loginFailed', email);
      return { error: error.message, lockedMs };
    }
    sec.registerSuccess(email);
    sec.log('login', email);
    return { error: null, lockedMs: 0 };
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
    if (!isSupabaseConfigured) {
      useSecurityStore.getState().log('passwordResetRequested', email);
      return { error: null };
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: RESET_REDIRECT,
    });
    // Always log the request (not whether an account existed) so the response is
    // uniform and we never leak which addresses are registered.
    useSecurityStore.getState().log('passwordResetRequested', email);
    return { error: error ? error.message : null };
  },

  updatePassword: async (password) => {
    const email = get().session?.user?.email ?? null;
    if (!isSupabaseConfigured) {
      set({ recovery: false });
      useSecurityStore.getState().log('passwordChanged', email);
      return { error: null };
    }
    const { error } = await supabase.auth.updateUser({ password });
    if (!error) {
      set({ recovery: false });
      useSecurityStore.getState().log('passwordChanged', email);
    }
    return { error: error ? error.message : null };
  },

  signOut: async () => {
    const email = get().session?.user?.email ?? null;
    if (isSupabaseConfigured) await supabase.auth.signOut();
    useSecurityStore.getState().log('logout', email);
    set({
      session: null,
      profile: null,
      memberships: [],
      currentAsociatieId: null,
      demo: false,
      recovery: false,
    });
  },

  signOutEverywhere: async () => {
    const email = get().session?.user?.email ?? null;
    // `global` scope revokes refresh tokens for every session of this account,
    // so a session on another device or a stolen token is invalidated too.
    if (isSupabaseConfigured) await supabase.auth.signOut({ scope: 'global' });
    useSecurityStore.getState().log('logoutEverywhere', email);
    set({
      session: null,
      profile: null,
      memberships: [],
      currentAsociatieId: null,
      demo: false,
      recovery: false,
    });
  },

  enterDemo: () => {
    // A demo login is recorded too, so the activity log is exercised offline.
    useSecurityStore.getState().log('login', null);
    set({ demo: true, loading: false });
  },
}));
