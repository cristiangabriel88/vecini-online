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
        inviteId: input.invite.id,
        locale: input.locale,
      }),
    });
    if (res.ok) return { ok: true };
    const body = await res.json().catch(() => ({})) as Record<string, unknown>;
    return { ok: false, error: typeof body.error === 'string' ? body.error : 'send-failed' };
  } catch {
    return { ok: false, error: 'network-error' };
  }
}
