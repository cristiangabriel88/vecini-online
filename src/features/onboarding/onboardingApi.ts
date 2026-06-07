import type { Role } from '@/shared/types/domain';
import { supabase } from '@/shared/lib/supabase';
import type { InviteStatus } from '@/features/invites/inviteLogic';
import type { OnboardingKind, ResolvedOnboarding } from './accountSetupLogic';

/**
 * Live-mode helpers for the account-setup-on-redemption flow (T55).
 *
 * These call the Supabase RPCs defined in the T55 migration:
 *   resolve_onboarding_token  -- anon-callable, returns invite context
 *   redeem_onboarding_token   -- authenticated-only, upserts users + membership
 *
 * The offline counterparts (resolveOnboarding + authStore.redeemInvite /
 * platformAsociatiiStore.consumeSetup) are unchanged and used when Supabase
 * is absent.
 *
 * Privacy: these modules never log token / email / password values.
 */

/** Shape returned by the resolve_onboarding_token RPC when status = 'ok'. */
interface ResolveRpcOk {
  status: 'ok';
  kind: 'admin_setup' | 'resident_invite';
  asociatie_id: string;
  asociatie_name: string | null;
  invitee_name: string | null;
  invitee_email: string | null;
  role: string;
}

/** Shape returned by the resolve_onboarding_token RPC for non-ok statuses. */
interface ResolveRpcErr {
  status: Exclude<InviteStatus, 'ok'>;
}

type ResolveRpcResult = ResolveRpcOk | ResolveRpcErr;

/** Shape returned by the redeem_onboarding_token RPC. */
export interface RedeemRpcResult {
  status: 'ok' | InviteStatus | 'email_mismatch' | 'rate_limited';
  asociatie_id?: string;
  role?: string;
  kind?: string;
}

/**
 * Resolve an onboarding token against the live backend.
 *
 * Returns:
 * - A full ResolvedOnboarding when the token is valid (status = 'ok')
 * - A status-only object for invalid/expired/used/revoked tokens
 * - null on network failure or unexpected RPC error
 */
export async function resolveTokenLive(
  token: string,
): Promise<ResolvedOnboarding | { status: Exclude<InviteStatus, 'ok'> } | null> {
  try {
    const { data, error } = await supabase.rpc('resolve_onboarding_token', {
      p_token: token,
    });
    if (error || !data) return null;

    const result = data as ResolveRpcResult;

    if (result.status !== 'ok') {
      return { status: result.status };
    }

    const kind: OnboardingKind = result.kind === 'admin_setup' ? 'setup' : 'invite';
    return {
      kind,
      status: 'ok',
      asociatieId: result.asociatie_id,
      asociatieName: result.asociatie_name ?? null,
      role: (result.role ?? 'proprietar') as Role,
      inviteeEmail: result.invitee_email ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * Redeem an onboarding token on the live backend. Requires an active auth
 * session (the caller must complete supabase.auth.signUp first). Returns the
 * RPC result: status (ok / expired / used / revoked / email_mismatch / unknown)
 * and, on success, asociatieId + role + kind.
 */
export async function redeemTokenLive(
  token: string,
  fullName: string,
  locale: string,
): Promise<RedeemRpcResult> {
  try {
    const { data, error } = await supabase.rpc('redeem_onboarding_token', {
      p_token: token,
      p_full_name: fullName,
      p_locale: locale,
    });
    if (error) return { status: 'unknown' };
    return (data as RedeemRpcResult) ?? { status: 'unknown' };
  } catch {
    return { status: 'unknown' };
  }
}
