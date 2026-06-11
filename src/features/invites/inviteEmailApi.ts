import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import type { InviteCode } from './inviteLogic';

/**
 * Dual-mode invitation-email delivery (T147, hardened T148).
 *
 * Offline (demo, no backend): there is no mailbox to reach, so the send is a
 * no-op that resolves `ok` and the caller stamps the invite as sent, mirroring
 * how the rest of the app simulates the live behaviour offline.
 *
 * Live (`isSupabaseConfigured`): POST the invite id to the `invite-email`
 * Netlify function with a bearer token so the function can re-verify the
 * caller's identity server-side.  The function resolves the recipient address,
 * onboarding token and asociatie name from the stored `invite_codes` row so
 * neither the recipient nor the link are accepted from the client (T148).
 *
 * Privacy: never send or log the recipient address or the invite link from
 * this module -- those are resolved server-side.
 */

export interface SendInviteEmailInput {
  invite: InviteCode;
  /** Recipient locale (the inviter's UI locale offline; `users.locale` live). */
  locale: string;
}

export interface SendInviteEmailResult {
  ok: boolean;
  /** A short, non-PII reason when `ok` is false. */
  error?: string;
}

const INVITE_EMAIL_FUNCTION = '/.netlify/functions/invite-email';

/**
 * Map a non-PII error code returned by `sendInviteEmail` (client guard or the
 * `invite-email` Netlify function) to an i18n key under `invites.emailError.*`.
 * Unknown codes fall back to the generic message so the UI always shows
 * something actionable. Used by every surface that sends an invite so a failed
 * send tells the admin *why* (mis-configured email backend, expired session,
 * rate limit, ...) instead of a blanket "try again".
 */
export function inviteEmailErrorKey(error?: string): string {
  switch (error) {
    case 'email-not-configured':
    case 'backend-not-configured':
      return 'invites.emailError.notConfigured';
    case 'no-session':
    case 'unauthorized':
    case 'missing-authorization':
    case 'invalid-authorization':
    case 'invalid-token':
      return 'invites.emailError.session';
    case 'forbidden':
      return 'invites.emailError.forbidden';
    case 'rate-limited':
      return 'invites.emailError.rateLimited';
    case 'invite-not-found':
      return 'invites.emailError.notFound';
    case 'invite-revoked':
    case 'invite-consumed':
    case 'invite-expired':
      return 'invites.emailError.invalid';
    case 'no-recipient':
      return 'invites.emailError.noRecipient';
    case 'network-error':
      return 'invites.emailError.network';
    case 'send-failed':
      return 'invites.emailError.sendFailed';
    default:
      return 'invites.emailError.generic';
  }
}

export async function sendInviteEmail(input: SendInviteEmailInput): Promise<SendInviteEmailResult> {
  if (!input.invite.inviteeEmail?.trim()) return { ok: false, error: 'no-recipient' };

  if (!isSupabaseConfigured) {
    // Demo/offline: simulate the dispatch so the UI reflects a sent invite.
    return { ok: true };
  }

  // Retrieve the session access token to authenticate the server-side call.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return { ok: false, error: 'no-session' };

  try {
    const res = await fetch(INVITE_EMAIL_FUNCTION, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        inviteId: input.invite.id.startsWith('inv-') ? input.invite.id.slice(4) : input.invite.id,
        locale: input.locale,
        token: input.invite.token,
      }),
    });
    if (res.ok) return { ok: true };
    if (res.status === 404) return { ok: false, error: 'backend-not-configured' };
    const body = await res.json().catch(() => ({})) as Record<string, unknown>;
    return { ok: false, error: typeof body.error === 'string' ? body.error : 'send-failed' };
  } catch {
    return { ok: false, error: 'network-error' };
  }
}
