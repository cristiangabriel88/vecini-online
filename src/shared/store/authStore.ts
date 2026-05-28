import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { env } from '@/shared/lib/env';
import type { Membership, Role, UserProfile } from '@/shared/types/domain';
import { mergeHydration, roleFor, sortByPrivilege } from '@/features/auth/hydrationLogic';
import { demoTenantContext } from '@/features/auth/demoTenant';
import { rememberExpired, setRemembered } from '@/features/auth/sessionPersistence';
import { buildFounderMembership, newLocalAsociatieId } from '@/features/onboarding/onboardingLogic';
import {
  type InviteStatus,
  buildMembershipFromInvite,
  findByCode,
  findByToken,
  validateInvite,
} from '@/features/invites/inviteLogic';
import { DEMO_CURRENT_USER_ID } from '@/shared/demo/demoData';
import { useInviteStore } from './inviteStore';
import { useNotificationStore } from './notificationStore';
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
  /**
   * Server-authoritative platform-superadmin status (`is_super_admin()` live, the
   * demo role offline). It is **not** a tenant membership role, so a superadmin is
   * recognised without (and never needs) an association membership. The real
   * privileged boundary stays the database RLS + service-role re-checks; this flag
   * only decides where the app routes the operator.
   */
  isPlatformSuperAdmin: boolean;
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
  /**
   * Account-creation-on-redemption, locatar invite path (T124). Resolve an
   * onboarding value (the opaque link token, or the manual code as a fallback)
   * against the invite store, consume it once (replay-safe) and link the granted
   * membership, selecting the asociație. Offline it also establishes the demo
   * session so a brand-new invitee lands in the app without a backend; live
   * account creation under RLS is T55. Returns the validation status.
   */
  redeemInvite: (value: string) => JoinResult;
  /**
   * Account-creation-on-redemption, admin setup path (T124). After the platform
   * store has consumed the one-time setup token (replay-safe), link the new admin
   * as founder of the provisioned asociație, record its name for the chrome and
   * select it. Offline it establishes the demo session so the admin lands in the
   * app; the live cross-tenant equivalent runs in the T92 service-role function.
   */
  activateProvisionedAdmin: (asociatieId: string, name: string) => void;
  /**
   * Sign in. `remember` decides session persistence: `true` keeps the session in
   * localStorage (survives a browser restart, 30-day cap), `false` keeps it in
   * sessionStorage (cleared on close, idle-timeout enforced). See
   * `sessionPersistence.ts`.
   */
  signIn: (email: string, password: string, remember: boolean) => Promise<SignInResult>;
  signUp: (email: string, password: string) => Promise<SignUpResult>;
  resendVerification: (email: string) => Promise<AuthResult>;
  requestPasswordReset: (email: string) => Promise<AuthResult>;
  updatePassword: (password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  /** Revoke every session for this account everywhere (global sign-out). */
  signOutEverywhere: () => Promise<void>;
  /**
   * Enter offline demo mode, optionally previewing the app as a specific role
   * (defaults to `admin`). The login screen uses this to let a visitor inspect
   * the admin, superadmin, and locatar experiences without a backend.
   */
  enterDemo: (role?: Role) => void;
  /**
   * DEV-stage only: sign in as the pre-seeded dev user for the given role.
   * Expects users seeded by `npm run pi:seed` (T176) at `{role}@dev.local`
   * with the password from `VITE_DEV_PASSWORD` (default `dev-password`).
   * No-ops in PROD or when Supabase is not configured.
   */
  signInAsDevUser: (role: Role) => Promise<void>;
}

// Monotonic token so a slow hydrate cannot overwrite the result of a newer one
// (e.g. fast user switch, or a sign-out that started after this read).
let hydrateSeq = 0;

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  memberships: [],
  currentAsociatieId: null,
  isPlatformSuperAdmin: false,
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
    // Enforce the 30-day absolute cap on remembered sessions: drop a session that
    // has outlived it before restoring, so the resident must re-authenticate.
    if (rememberExpired()) {
      await supabase.auth.signOut();
      setRemembered(false);
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
          isPlatformSuperAdmin: false,
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
      // The reads run under RLS: a user sees only their own profile row and only
      // memberships scoped to them. `is_super_admin()` resolves the caller against
      // the platform_admins roster (SECURITY DEFINER, T91) — server-authoritative,
      // so the client never asserts the platform role itself. The demo seed stays
      // the offline fallback.
      const [profileRes, membershipRes, superAdminRes] = await Promise.all([
        supabase.from('users').select('*').eq('id', userId).maybeSingle(),
        supabase.from('memberships').select('*').eq('user_id', userId).is('ended_at', null),
        supabase.rpc('is_super_admin'),
      ]);
      // Drop stale results: a newer hydrate began, or the session changed/ended
      // while these reads were in flight. The owning call applies the state.
      if (seq !== hydrateSeq || get().session?.user?.id !== userId) return;
      const prev = get();
      set({
        ...mergeHydration(
          {
            profile: prev.profile,
            memberships: prev.memberships,
            currentAsociatieId: prev.currentAsociatieId,
          },
          profileRes,
          membershipRes,
        ),
        // Any error is treated as "not a superadmin" so a failed check never grants
        // the platform surface.
        isPlatformSuperAdmin: superAdminRes.error ? false : Boolean(superAdminRes.data),
      });
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

  redeemInvite: (value) => {
    const userId = get().session?.user?.id ?? DEMO_CURRENT_USER_ID;
    const invites = useInviteStore.getState();
    // The link carries the opaque token; the manual fallback carries the code.
    const byToken = findByToken(invites.invites, value);
    const target = byToken ?? findByCode(invites.invites, value);
    const status = validateInvite(target);
    if (status !== 'ok' || !target) return { status, asociatieId: null };
    // Offline a brand-new invitee has no session, so establish the demo session
    // here (live account creation under RLS is T55). A no-op when live.
    const sessionPatch = isSupabaseConfigured ? {} : { demo: true, loading: false };
    const alreadyMember = get().memberships.some(
      (m) => m.asociatie_id === target.asociatieId && m.ended_at === null,
    );
    if (alreadyMember) {
      set({ currentAsociatieId: target.asociatieId, ...sessionPatch });
      return { status: 'ok', asociatieId: target.asociatieId };
    }
    // Consume atomically by the same key we matched on, so a single-use
    // token/code cannot be double-spent under a race, then link membership.
    const consumed = byToken ? invites.consumeByToken(value, userId) : invites.consume(value, userId);
    if (consumed.status !== 'ok' || !consumed.invite) {
      return { status: consumed.status, asociatieId: null };
    }
    const membership = buildMembershipFromInvite(userId, consumed.invite);
    set({
      memberships: sortByPrivilege([...get().memberships, membership]),
      currentAsociatieId: consumed.invite.asociatieId,
      ...sessionPatch,
    });
    // Notify the invite issuer (admin) that a new member joined (T126).
    // We only notify when there is a known issuer; the notification is purely
    // informational and never blocks the join flow.
    if (consumed.invite.createdBy) {
      useNotificationStore.getState().emitMembershipJoined({
        recipientUserId: consumed.invite.createdBy,
        asociatieId: consumed.invite.asociatieId,
        memberName: consumed.invite.inviteeName,
        memberRole: consumed.invite.role,
        now: Date.now(),
      });
    }
    return { status: 'ok', asociatieId: consumed.invite.asociatieId };
  },

  activateProvisionedAdmin: (asociatieId, name) => {
    const userId = get().session?.user?.id ?? DEMO_CURRENT_USER_ID;
    const sessionPatch = isSupabaseConfigured ? {} : { demo: true, loading: false };
    if (get().memberships.some((m) => m.asociatie_id === asociatieId && m.ended_at === null)) {
      set({ currentAsociatieId: asociatieId, ...sessionPatch });
      return;
    }
    const membership = buildFounderMembership(userId, asociatieId);
    const known = get().localAsociatii.some((a) => a.id === asociatieId);
    set({
      memberships: sortByPrivilege([...get().memberships, membership]),
      currentAsociatieId: asociatieId,
      localAsociatii: known
        ? get().localAsociatii
        : [...get().localAsociatii, { id: asociatieId, name: name.trim() }],
      ...sessionPatch,
    });
  },

  signIn: async (email, password, remember) => {
    const sec = useSecurityStore.getState();
    if (!isSupabaseConfigured) {
      setRemembered(remember);
      get().enterDemo();
      return { error: null, lockedMs: 0 };
    }
    // Refuse before hitting the network while a lockout is in force.
    const preLock = sec.lockRemainingMs(email);
    if (preLock > 0) {
      sec.log('loginLocked', email);
      return { error: 'locked', lockedMs: preLock };
    }
    // Record the choice before the session is written so the storage adapter
    // routes it into the right backing store (local vs session storage).
    setRemembered(remember);
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
    setRemembered(false); // reset to the secure default for the next sign-in
    useSecurityStore.getState().log('logout', email);
    hydrateSeq++; // invalidate any in-flight hydrate for the old session
    set({
      session: null,
      profile: null,
      memberships: [],
      currentAsociatieId: null,
      isPlatformSuperAdmin: false,
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
    setRemembered(false); // reset to the secure default for the next sign-in
    useSecurityStore.getState().log('logoutEverywhere', email);
    hydrateSeq++; // invalidate any in-flight hydrate for the old session
    set({
      session: null,
      profile: null,
      memberships: [],
      currentAsociatieId: null,
      isPlatformSuperAdmin: false,
      localAsociatii: [],
      hydrating: false,
      demo: false,
      recovery: false,
    });
  },

  enterDemo: (role = 'admin') => {
    // Persist the chosen role so a hard refresh re-enters the same persona (T174).
    try { localStorage.setItem('iv.demo.role', role); } catch { /* storage unavailable */ }
    // A demo login is recorded too, so the activity log is exercised offline.
    useSecurityStore.getState().log('login', null);
    // Seed local tenant context so demo mode has a real active asociație + role
    // to scope by (no backend to hydrate from). The superadmin preview carries no
    // membership — its authority is the platform flag, not a tenant role.
    const { currentAsociatieId, memberships } = demoTenantContext(role);
    set({
      demo: true,
      loading: false,
      currentAsociatieId,
      memberships,
      isPlatformSuperAdmin: role === 'super_admin',
    });
  },

  signInAsDevUser: async (role) => {
    if (!isSupabaseConfigured) return;
    // super_admin uses a dot to keep the email valid: super.admin@dev.local
    const localPart = role === 'super_admin' ? 'super.admin' : role;
    const email = `${localPart}@dev.local`;
    const password = (import.meta.env.VITE_DEV_PASSWORD as string | undefined) ?? 'dev-password';
    await supabase.auth.signInWithPassword({ email, password });
    // onAuthStateChange picks up the new session and runs hydrate().
  },
}));
