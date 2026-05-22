import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { env } from '@/shared/lib/env';
import type { Membership, Role, UserProfile } from '@/shared/types/domain';
import { mergeHydration, roleFor, sortByPrivilege } from '@/features/auth/hydrationLogic';
import { demoTenantContext } from '@/features/auth/demoTenant';
import { buildFounderMembership, newLocalAsociatieId } from '@/features/onboarding/onboardingLogic';
import {
  type InviteStatus,
  buildMembershipFromInvite,
  findByCode,
  validateInvite,
} from '@/features/invites/inviteLogic';
import { DEMO_CURRENT_USER_ID } from '@/shared/demo/demoData';
import { useInviteStore } from './inviteStore';
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

interface JoinResult {
  /** Validation outcome of the entered code; `ok` means the join succeeded. */
  status: InviteStatus;
  /** The joined asociație when `status === 'ok'`, otherwise null. */
  asociatieId: string | null;
}

interface AuthState {
  session: Session | null;
  profile: UserProfile | null;
  memberships: Membership[];
  /** The asociație whose data the app is currently scoped to (null = none yet). */
  currentAsociatieId: string | null;
  /** Asociații created locally this session (offline path); name kept for display (T59). */
  localAsociatii: { id: string; name: string }[];
  loading: boolean;
  /** True while profile/memberships are being fetched for the current session. */
  hydrating: boolean;
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
  /**
   * Create an asociație locally (offline path): the current user becomes its
   * admin and it is selected as active. Returns the new asociație id. Live
   * persistence is a separate activation step (T55).
   */
  createLocalAsociatie: (name: string) => string;
  /**
   * Join an asociație by redeeming an invite code (offline path): validate it,
   * consume it once (replay-safe), create the granted membership and select the
   * asociație as active. Returns the validation status so the UI can report
   * `expired`/`used`/`revoked`/`unknown` bilingually. Live consumption is a
   * replay-safe RPC under RLS (T55).
   */
  joinByInvite: (code: string) => JoinResult;
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

// Monotonic token so a slow hydrate cannot overwrite the result of a newer one
// (e.g. fast user switch, or a sign-out that started after this read).
let hydrateSeq = 0;

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  memberships: [],
  currentAsociatieId: null,
  localAsociatii: [],
  loading: true,
  hydrating: false,
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
        hydrateSeq++; // invalidate any in-flight hydrate for the old session
        set({
          profile: null,
          memberships: [],
          currentAsociatieId: null,
          localAsociatii: [],
          hydrating: false,
          recovery: false,
        });
      } else if (event === 'SIGNED_IN') {
        void get().hydrate();
      }
    });
  },

  hydrate: async () => {
    if (!isSupabaseConfigured) return;
    const userId = get().session?.user?.id;
    if (!userId) return;
    const seq = ++hydrateSeq;
    set({ hydrating: true });
    try {
      // Both reads run under RLS: a user sees only their own profile row and only
      // memberships scoped to them. The demo seed stays the offline fallback.
      const [profileRes, membershipRes] = await Promise.all([
        supabase.from('users').select('*').eq('id', userId).maybeSingle(),
        supabase.from('memberships').select('*').eq('user_id', userId).is('ended_at', null),
      ]);
      // Drop stale results: a newer hydrate began, or the session changed/ended
      // while these reads were in flight. The owning call applies the state.
      if (seq !== hydrateSeq || get().session?.user?.id !== userId) return;
      const prev = get();
      set(
        mergeHydration(
          {
            profile: prev.profile,
            memberships: prev.memberships,
            currentAsociatieId: prev.currentAsociatieId,
          },
          profileRes,
          membershipRes,
        ),
      );
    } finally {
      // Only the latest in-flight hydrate owns the flag; a stale one must not
      // flip it off while a newer read is still running.
      if (seq === hydrateSeq) set({ hydrating: false });
    }
  },

  activeRole: () => roleFor(get().memberships, get().currentAsociatieId),

  setActiveAsociatie: (asociatieId) => {
    const isMember = get().memberships.some(
      (m) => m.asociatie_id === asociatieId && m.ended_at === null,
    );
    if (isMember) set({ currentAsociatieId: asociatieId });
  },

  createLocalAsociatie: (name) => {
    const userId = get().session?.user?.id ?? DEMO_CURRENT_USER_ID;
    const asociatieId = newLocalAsociatieId();
    const membership = buildFounderMembership(userId, asociatieId);
    set({
      memberships: sortByPrivilege([...get().memberships, membership]),
      currentAsociatieId: asociatieId,
      localAsociatii: [...get().localAsociatii, { id: asociatieId, name: name.trim() }],
    });
    return asociatieId;
  },

  joinByInvite: (code) => {
    const userId = get().session?.user?.id ?? DEMO_CURRENT_USER_ID;
    const invites = useInviteStore.getState();
    // Peek first so an already-member retry does not waste a single-use code: a
    // user who is already in the code's asociație just re-selects it.
    const target = findByCode(invites.invites, code);
    const status = validateInvite(target);
    if (status !== 'ok' || !target) return { status, asociatieId: null };
    const alreadyMember = get().memberships.some(
      (m) => m.asociatie_id === target.asociatieId && m.ended_at === null,
    );
    if (alreadyMember) {
      set({ currentAsociatieId: target.asociatieId });
      return { status: 'ok', asociatieId: target.asociatieId };
    }
    // Consume atomically (the store re-validates inside the update, so a
    // single-use code cannot be double-spent under a race), then link membership.
    const consumed = invites.consume(code, userId);
    if (consumed.status !== 'ok' || !consumed.invite) {
      return { status: consumed.status, asociatieId: null };
    }
    const membership = buildMembershipFromInvite(userId, consumed.invite);
    set({
      memberships: sortByPrivilege([...get().memberships, membership]),
      currentAsociatieId: consumed.invite.asociatieId,
    });
    return { status: 'ok', asociatieId: consumed.invite.asociatieId };
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
    hydrateSeq++; // invalidate any in-flight hydrate for the old session
    set({
      session: null,
      profile: null,
      memberships: [],
      currentAsociatieId: null,
      localAsociatii: [],
      hydrating: false,
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
    hydrateSeq++; // invalidate any in-flight hydrate for the old session
    set({
      session: null,
      profile: null,
      memberships: [],
      currentAsociatieId: null,
      localAsociatii: [],
      hydrating: false,
      demo: false,
      recovery: false,
    });
  },

  enterDemo: () => {
    // A demo login is recorded too, so the activity log is exercised offline.
    useSecurityStore.getState().log('login', null);
    // Seed local tenant context so demo mode has a real active asociație + role
    // to scope by (no backend to hydrate from).
    const { currentAsociatieId, memberships } = demoTenantContext();
    set({ demo: true, loading: false, currentAsociatieId, memberships });
  },
}));
