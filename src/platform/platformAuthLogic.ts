/**
 * Pure access-resolution logic for the platform (superadmin) app shell (T93).
 *
 * The platform app is a separate front-end on its own origin, gated to platform
 * operators. The real security boundary is the database (`is_super_admin()` +
 * the cross-tenant RLS from T91) and the server-side re-checks in the privileged
 * functions (T92/T98) — the client is never trusted to assert the role. This
 * module only decides *what to render* from the signals the shell already holds,
 * so the gate component stays declarative and is unit-testable in isolation.
 */

/** The six mutually-exclusive states the platform gate can resolve to. */
export type PlatformAccess =
  // The shared session is still being restored (initial load).
  | 'loading'
  // No session and no demo: send the visitor to the platform login.
  | 'unauthenticated'
  // A live session exists; the server-side super_admin check is still running.
  | 'verifying'
  // A live session exists but the account is not a platform superadmin.
  | 'denied'
  // Verified superadmin but no second factor enrolled (T100). The gate blocks
  // console access and shows a mandatory enrollment screen.
  | 'mfa-enrollment-required'
  // Demo, or a verified live superadmin with 2FA enrolled: the console is reachable.
  | 'granted';

export interface PlatformAccessInput {
  /** True while the shared auth store is restoring an existing session. */
  loading: boolean;
  /** True for the offline demo superadmin session (no backend). */
  demo: boolean;
  /** True when a live Supabase session is present. */
  hasSession: boolean;
  /** True while the `is_super_admin()` check is in flight. */
  verifying: boolean;
  /** Result of the server-side check: null until it has run. */
  isSuperAdmin: boolean | null;
  /** True when a real Supabase backend is configured (T100). */
  supabaseConfigured?: boolean;
  /** True once the MFA enrollment status has been resolved at least once (T100). */
  mfaLoaded?: boolean;
  /** True when the account has a verified second factor enrolled (T100). */
  mfaEnrolled?: boolean;
}

/**
 * Resolve the platform access state. Demo always grants (the offline showcase),
 * so it short-circuits before any live signal is consulted. For a live session
 * the decision waits on the server-authoritative `is_super_admin()` result: an
 * unknown result keeps the shell in `verifying` (never flashing the console or a
 * denial), and only an explicit `false` denies.
 */
export function resolvePlatformAccess(input: PlatformAccessInput): PlatformAccess {
  if (input.demo) return 'granted';
  if (input.loading) return 'loading';
  if (!input.hasSession) return 'unauthenticated';
  if (input.verifying || input.isSuperAdmin === null) return 'verifying';
  if (!input.isSuperAdmin) return 'denied';
  // T100: a verified superadmin must have a second factor enrolled before the
  // console is reachable. Only enforced on the live path; demo mode is exempt so
  // the showcase remains fully navigable without a backend.
  if (input.supabaseConfigured && input.mfaLoaded && !input.mfaEnrolled) {
    return 'mfa-enrollment-required';
  }
  return 'granted';
}
